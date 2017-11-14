from typing import Set  # noqa

from django.apps import apps
from django.utils.translation import ugettext_noop

from ..utils.auth import has_perm
from ..utils.collection import Collection
from .models import Motion, State, Workflow


def create_builtin_workflows(sender, **kwargs):
    """
    Receiver function to create a simple and a complex workflow. It is
    connected to the signal django.db.models.signals.post_migrate during
    app loading.
    """
    if Workflow.objects.exists():
        # If there is at least one workflow, then do nothing.
        return

    workflow_1 = Workflow.objects.create(name='Grüne')
    state_1_1 = State.objects.create(name=ugettext_noop('eingereicht'),
                                     workflow=workflow_1,
                                     required_permission_to_see='motions.can_manage',
                                     allow_support=False,
                                     dont_set_identifier=True,
                                     allow_submitter_edit=False)
    state_1_2 = State.objects.create(name=ugettext_noop('veröffentlicht'),
                                     workflow=workflow_1,
                                     action_word='veröffentlicht',
                                     allow_support=True,
                                     dont_set_identifier=True,
                                     allow_submitter_edit=False)
    state_1_3 = State.objects.create(name=ugettext_noop('zugelassen'),
                                     workflow=workflow_1,
                                     action_word='zugelassen',
                                     allow_support=True,
                                     dont_set_identifier=False,
                                     allow_create_poll=True,
                                     allow_submitter_edit=False)

    # Empfehlungen der Antragskommission, inkl. passenden Status
    state_1_10 = State.objects.create(name=ugettext_noop('accepted'),
                                      workflow=workflow_1,
                                      action_word='angenommen',
                                      recommendation_label='Übernahme',
                                      css_class='success')
    state_1_11 = State.objects.create(name='angenommen nach Modifizierung',
                                      workflow=workflow_1,
                                      action_word='modifizierte Übernahme',
                                      recommendation_label='modifizierte Übernahme',
                                      show_recommendation_extension_field=True,
                                      show_state_extension_field=True,
                                      css_class='success')
    state_1_12 = State.objects.create(name='zurückgezogen wegen modifizierte Übernahme',
                                      workflow=workflow_1,
                                      action_word='zurückgezogen wegen modifizierte Übernahme',
                                      recommendation_label='zurückgezogen wegen modifizierte Übernahme',
                                      show_recommendation_extension_field=True,
                                      show_state_extension_field=True,
                                      css_class='default')

    # Empfehlungen ohne passenden Status
    state_1_a = State.objects.create(name='strittig',
                                     workflow=workflow_1,
                                     recommendation_label='strittig',
                                     css_class='warning')
    state_1_b = State.objects.create(name='Abstimmung',
                                     workflow=workflow_1,
                                     recommendation_label='Abstimmung',
                                     css_class='warning')

    # Beschlüsse
    state_1_13 = State.objects.create(name='erledigt',
                                      workflow=workflow_1,
                                      action_word='erledigt',
                                      recommendation_label='erledigt',
                                      show_recommendation_extension_field=True,
                                      show_state_extension_field=True,
                                      css_class='default')
    state_1_14 = State.objects.create(name='zurückgezogen',
                                      workflow=workflow_1,
                                      action_word='zurückgezogen',
                                      recommendation_label='zurückgezogen',
                                      css_class='default')
    state_1_15 = State.objects.create(name='Überweisung in Ausschuss',
                                      workflow=workflow_1,
                                      action_word='Überweisung in Ausschuss',
                                      css_class='default')
    state_1_16 = State.objects.create(name='nicht befasst',
                                      workflow=workflow_1,
                                      action_word='nicht befasst',
                                      css_class='default')
    state_1_17 = State.objects.create(name=ugettext_noop('rejected'),
                                      workflow=workflow_1,
                                      action_word='abgelehnt',
                                      recommendation_label='Ablehnung nach Abstimmung der Versammlung',
                                      css_class='danger')
    state_1_18 = State.objects.create(name='Sonstiges',
                                      workflow=workflow_1,
                                      action_word='Sonstiges',
                                      recommendation_label='Sonstiges',
                                      show_recommendation_extension_field=True,
                                      show_state_extension_field=True,
                                      css_class='default')
    state_1_1.next_states.add(state_1_2)
    state_1_2.next_states.add(state_1_3)
    state_1_3.next_states.add(state_1_10, state_1_11, state_1_12, state_1_13, state_1_14, state_1_15, state_1_16, state_1_17, state_1_18)
    workflow_1.first_state = state_1_1
    workflow_1.save()


def get_permission_change_data(sender, permissions, **kwargs):
    """
    Yields all necessary collections if 'motions.can_see' permission changes.
    """
    motions_app = apps.get_app_config(app_label='motions')
    for permission in permissions:
        # There could be only one 'motions.can_see' and then we want to return data.
        if permission.content_type.app_label == motions_app.label and permission.codename == 'can_see':
            yield from motions_app.get_startup_elements()


def required_users(sender, request_user, **kwargs):
    """
    Returns all user ids that are displayed as as submitter or supporter in
    any motion if request_user can see motions. This function may return an
    empty set.
    """
    submitters_supporters = set()  # type: Set[int]
    if has_perm(request_user, 'motions.can_see'):
        for motion_collection_element in Collection(Motion.get_collection_string()).element_generator():
            full_data = motion_collection_element.get_full_data()
            submitters_supporters.update(full_data['submitters_id'])
            submitters_supporters.update(full_data['supporters_id'])
    return submitters_supporters
