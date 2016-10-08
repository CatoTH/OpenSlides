(function () {

"use strict";

angular.module('OpenSlidesApp.motions', [
  'OpenSlidesApp.users',
  'OpenSlidesApp.motions.lineNumbering',
  'OpenSlidesApp.motions.diff',
  'OpenSlidesApp.motions.DOCX'
])

.factory('WorkflowState', [
    'DS',
    function (DS) {
        return DS.defineResource({
            name: 'motions/workflowstate',
            methods: {
                getNextStates: function () {
                    // TODO: Use filter with params with operator 'in'.
                    var states = [];
                    _.forEach(this.next_states_id, function (stateId) {
                        states.push(DS.get('motions/workflowstate', stateId));
                    });
                    return states;
                },
                getRecommendations: function () {
                    var params = {
                        where: {
                            'workflow_id': {
                                '==': this.workflow_id
                            },
                            'recommendation_label': {
                                '!=': null
                            }
                        }
                    };
                    return DS.filter('motions/workflowstate', params);
                }
            }
        });
    }
])

.factory('Workflow', [
    'DS',
    'jsDataModel',
    'WorkflowState',
    function (DS, jsDataModel, WorkflowState) {
        return DS.defineResource({
            name: 'motions/workflow',
            useClass: jsDataModel,
            relations: {
                hasMany: {
                    'motions/workflowstate': {
                        localField: 'states',
                        foreignKey: 'workflow_id',
                    }
                }
            }
        });
    }
])

.factory('MotionPoll', [
    'DS',
    'gettextCatalog',
    'Config',
    function (DS, gettextCatalog, Config) {
        return DS.defineResource({
            name: 'motions/motionpoll',
            relations: {
                belongsTo: {
                    'motions/motion': {
                        localField: 'motion',
                        localKey: 'motion_id',
                    }
                }
            },
            methods: {
                // returns object with value and percent
                getVote: function (vote, type) {
                    if (!this.has_votes) {
                        return;
                    }
                    var impossible = false;
                    var value = '';
                    switch (vote) {
                        case -1:
                            value = gettextCatalog.getString('majority');
                            impossible = true;
                            break;
                        case -2:
                            value = gettextCatalog.getString('undocumented');
                            impossible = true;
                            break;
                        default:
                            if (vote >= 0) {
                                value = vote;
                            } else {
                                value = 0; //value was not defined
                            }
                            break;
                    }
                    // calculate percent value
                    var config = Config.get('motions_poll_100_percent_base').value;
                    var percentStr;
                    var percentNumber = null;
                    var base = null;
                    if (!impossible) {
                        if (config == "YES_NO_ABSTAIN") {
                            if (type == 'yes' || type == 'no' || type == 'abstain') {
                                base = this.yes + this.no + this.abstain;
                            }
                        } else if (config == "YES_NO") {
                            if (type == 'yes' || type == 'no') {
                                base = this.yes + this.no;
                            }
                        } else if (config == "VALID" && type !== 'votescast' && type !== 'votesinvalid' && 
                            this.votesvalid > 0) {
                            base = this.votesvalid;
                        } else if (config == "CAST" && this.votescast > 0) {
                            base = this.votescast;
                        }
                    }
                    if (base !== null) {
                        percentNumber = Math.round(vote * 100 / (base) * 10) / 10;
                    }
                    if (percentNumber !== null) {
                        percentStr = "(" + percentNumber + "%)";
                    }
                    return {
                        'value': value,
                        'percentStr': percentStr,
                        'percentNumber': percentNumber
                    };
                }
            }
        });
    }
])

.factory('Motion', [
    'DS',
    'MotionPoll',
    'MotionChangeRecommendation',
    'MotionComment',
    'jsDataModel',
    'gettext',
    'operator',
    'Config',
    'lineNumberingService',
    'diffService',
    function(DS, MotionPoll, MotionChangeRecommendation, MotionComment, jsDataModel, gettext, operator, Config,
             lineNumberingService, diffService) {
        var name = 'motions/motion';
        return DS.defineResource({
            name: name,
            useClass: jsDataModel,
            verboseName: gettext('Motion'),
            verboseNamePlural: gettext('Motions'),
            validate: function (resource, data, callback) {
                MotionComment.populateFieldsReverse(data);
                callback(null, data);
            },
            methods: {
                getResourceName: function () {
                    return name;
                },
                getVersion: function (versionId) {
                    versionId = versionId || this.active_version;
                    var index;
                    if (versionId == -1) {
                        index = this.versions.length - 1;
                    } else {
                        index = _.findIndex(this.versions, function (element) {
                            return element.id == versionId;
                        });
                    }
                    return this.versions[index] || {};
                },
                getTitle: function (versionId) {
                    return this.getVersion(versionId).title;
                },
                getText: function (versionId) {
                    return this.getVersion(versionId).text;
                },
                getTextWithLineBreaks: function (versionId, highlight, callback) {
                    var lineLength = Config.get('motions_line_length').value,
                        html = this.getVersion(versionId).text;

                    return lineNumberingService.insertLineNumbers(html, lineLength, highlight, callback);
                },

                /* Not used currently
                getTextWithChangeRecommendationsAsDiff: function (versionId, diffFormatterCb) {
                    var lineLength = Config.get('motions_line_length').value,
                        html = this.getVersion(versionId).text,
                        changes = this.getChangeRecommendations(versionId);

                    for (var i = 0; i < changes.length; i++) {
                        (function (change) {
                            html = lineNumberingService.insertLineNumbers(html, lineLength);
                            var cb = function (oldFragment, newFragment) {
                                    return diffFormatterCb(change, oldFragment, newFragment);
                                };
                            html = diffService.addDiffMarkup(
                                html, change.text, change.line_from, change.line_to, cb
                            );
                        }(changes[i]));
                    }

                    return lineNumberingService.insertLineNumbers(html, lineLength);
                },
                */

                getTextBetweenChangeRecommendations: function (versionId, change1, change2) {
                    var line_from = (change1 ? change1.line_to : 1),
                        line_to = (change2 ? change2.line_from : null);

                    if (line_from > line_to) {
                        throw 'Invalid call of getTextBetweenChangeRecommendations: change1 needs to be before change2';
                    }
                    if (line_from == line_to) {
                        return '';
                    }

                    var lineLength = Config.get('motions_line_length').value,
                        html = lineNumberingService.insertLineNumbers(this.getVersion(versionId).text, lineLength);

                    var data = diffService.extractRangeByLineNumbers(html, line_from, line_to);

                    html = data.outerContextStart + data.innerContextStart + data.html +
                        data.innerContextEnd + data.outerContextEnd;
                    html = lineNumberingService.insertLineNumbers(html, lineLength, null, null, line_from);

                    return html;
                },
                getTextRemainderAfterLastChangeRecommendation: function(versionId, changes) {
                    var maxLine = 0;
                    for (var i = 0; i < changes.length; i++) {
                        if (changes[i].line_to > maxLine) {
                            maxLine = changes[i].line_to;
                        }
                    }

                    var lineLength = Config.get('motions_line_length').value,
                        html = lineNumberingService.insertLineNumbers(this.getVersion(versionId).text, lineLength);

                    var data = diffService.extractRangeByLineNumbers(html, maxLine, null);
                    html = data.outerContextStart + data.innerContextStart +
                        data.html +
                        data.innerContextEnd + data.outerContextEnd;
                    html = lineNumberingService.insertLineNumbers(html, lineLength, null, null, maxLine);

                    return html;
                },
                getTextWithAcceptedChangeRecommendations: function (versionId) {
                    var lineLength = Config.get('motions_line_length').value,
                        html = this.getVersion(versionId).text,
                        changes = this.getChangeRecommendations(versionId),
                        fragment;

                    for (var i = 0; i < changes.length; i++) {
                        var change = changes[i];
                        if (change.status != 2) {
                            html = lineNumberingService.insertLineNumbers(html, lineLength);
                            fragment = diffService.htmlToFragment(html);
                            html = diffService.replaceLines(fragment, change.text, change.line_from, change.line_to);
                        }
                    }

                    return lineNumberingService.insertLineNumbers(html, lineLength);
                },
                setTextStrippingLineBreaks: function (text) {
                    this.text = lineNumberingService.stripLineNumbers(text);
                },
                getReason: function (versionId) {
                    return this.getVersion(versionId).reason;
                },
                // link name which is shown in search result
                getSearchResultName: function () {
                    return this.getTitle();
                },
                // subtitle of search result
                getSearchResultSubtitle: function () {
                    return "Motion";
                },
                // returns all change recommendations for this given version, sorted by line (descending)
                getChangeRecommendations: function (versionId) {
                    versionId = versionId || this.active_version;
                    return MotionChangeRecommendation.filter({
                        where: {
                            motion_version_id: versionId
                        },
                        orderBy: [
                            ['line_from', 'DESC']
                        ]
                    });
                },
                isAllowed: function (action) {
                    /*
                     * Return true if the requested user is allowed to do the specific action.
                     * There are the following possible actions.
                     * - see
                     * - update
                     * - delete
                     * - create_poll
                     * - support
                     * - unsupport
                     * - change_state
                     * - reset_state
                     * - change_recommendation
                     *
                     *  NOTE: If you update this function please also update the
                     *  'get_allowed_actions' function on server side in motions/models.py.
                     */
                    switch (action) {
                        case 'see':
                            return (
                                operator.hasPerms('motions.can_see') &&
                                (
                                    !this.state.required_permission_to_see ||
                                    operator.hasPerms(this.state.required_permission_to_see) ||
                                    (operator.user in this.submitters)
                                )
                            );
                        case 'update':
                            return (
                                operator.hasPerms('motions.can_manage') ||
                                (
                                    ($.inArray(operator.user, this.submitters) != -1) &&
                                    this.state.allow_submitter_edit
                                )
                            );
                        case 'quickedit':
                            return operator.hasPerms('motions.can_manage');
                        case 'delete':
                            return operator.hasPerms('motions.can_manage');
                        case 'create_poll':
                            return (
                                operator.hasPerms('motions.can_manage') &&
                                this.state.allow_create_poll
                            );
                        case 'support':
                            return (
                                operator.hasPerms('motions.can_support') &&
                                this.state.allow_support &&
                                Config.get('motions_min_supporters').value > 0 &&
                                ($.inArray(operator.user, this.submitters) == -1) &&
                                ($.inArray(operator.user, this.supporters) == -1)
                            );
                        case 'unsupport':
                            return (
                                this.state.allow_support &&
                                ($.inArray(operator.user, this.supporters) != -1)
                            );
                        case 'change_state':
                            return operator.hasPerms('motions.can_manage');
                        case 'reset_state':
                            return operator.hasPerms('motions.can_manage');
                        case 'change_recommendation':
                            return operator.hasPerms('motions.can_manage');
                        case 'can_manage':
                            return operator.hasPerms('motions.can_manage');
                        default:
                            return false;
                    }
                }
            },
            relations: {
                belongsTo: {
                    'motions/category': {
                        localField: 'category',
                        localKey: 'category_id',
                    },
                    'agenda/item': {
                        localKey: 'agenda_item_id',
                        localField: 'agenda_item',
                    }
                },
                hasMany: {
                    'core/tag': {
                        localField: 'tags',
                        localKeys: 'tags_id',
                    },
                    'mediafiles/mediafile': {
                        localField: 'attachments',
                        localKeys: 'attachments_id',
                    },
                    'users/user': [
                        {
                            localField: 'submitters',
                            localKeys: 'submitters_id',
                        },
                        {
                            localField: 'supporters',
                            localKeys: 'supporters_id',
                        }
                    ],
                    'motions/motionpoll': {
                        localField: 'polls',
                        foreignKey: 'motion_id',
                    }
                },
                hasOne: {
                    'motions/workflowstate': [
                        {
                            localField: 'state',
                            localKey: 'state_id',
                        },
                        {
                            localField: 'recommendation',
                            localKey: 'recommendation_id',
                        }
                    ]
                }
            }
        });
    }
])

// Service for generic comment fields
.factory('MotionComment', [
    'Config',
    'operator',
    function (Config, operator) {
        return {
            getFormFields: function () {
                var fields = Config.get('motions_comments').value;
                return _.map(
                    fields,
                    function (field) {
                        return {
                            key: 'comment ' + field.name,
                            type: 'input',
                            templateOptions: {
                                label: field.name,
                            },
                            hide: !operator.hasPerms("motions.can_see_and_manage_comments")
                        };
                    }
                );
            },
            populateFields: function (motion) {
                // Populate content of motion.comments to the single comment
                // fields like motion['comment MyComment'], motion['comment MyOtherComment'], ...
                var fields = Config.get('motions_comments').value;
                if (!motion.comments) {
                    motion.comments = [];
                }
                for (var i = 0; i < fields.length; i++) {
                    motion['comment ' + fields[i].name] = motion.comments[i];
                }
            },
            populateFieldsReverse: function (motion) {
                // Reverse equivalent to populateFields.
                var fields = Config.get('motions_comments').value;
                motion.comments = [];
                for (var i = 0; i < fields.length; i++) {
                    motion.comments.push(motion['comment ' + fields[i].name] || '');
                }
            }
        };
    }
])

.factory('Category', [
    'DS',
    function(DS) {
        return DS.defineResource({
            name: 'motions/category',
        });
    }
])

.factory('MotionList', [
    function () {
        return {
            getList: function (items){
                var list = [];
                _.each(items, function (item) {
                    list.push({ id: item.id,
                                item: item });
                });
                return list;
            }
        };
    }
])

.factory('MotionChangeRecommendation', [
    'DS',
    'jsDataModel',
    function (DS, jsDataModel) {
        return DS.defineResource({
            name: 'motions/motionchangerecommendation',
            useClass: jsDataModel,
            /*
            belongsTo: {
                    'motions/motion': {
                        localField: 'motion',
                        localKey: 'motion_id',
                    }
                }
             */
            methods: {
                saveStatus: function() {
                    this.DSSave();
                }
            }
        });
    }
])

.run([
    'Motion',
    'Category',
    'Workflow',
    'MotionChangeRecommendation',
    function(Motion, Category, Workflow, MotionChangeRecommendation) {}
])


// Mark all motion workflow state strings for translation in JavaScript.
// (see motions/signals.py)
.config([
    'gettext',
    function (gettext) {
        // workflow 1
        gettext('Simple Workflow');
        gettext('submitted');
        gettext('accepted');
        gettext('Accept');
        gettext('Acceptance');
        gettext('rejected');
        gettext('Reject');
        gettext('Rejection');
        gettext('not decided');
        gettext('Do not decide');
        gettext('No decision');
        // workflow 2
        gettext('Complex Workflow');
        gettext('published');
        gettext('permitted');
        gettext('Permit');
        gettext('Permission');
        gettext('accepted');
        gettext('Accept');
        gettext('Acceptance');
        gettext('rejected');
        gettext('Reject');
        gettext('Rejection');
        gettext('withdrawed');
        gettext('Withdraw');
        gettext('adjourned');
        gettext('Adjourn');
        gettext('Adjournment');
        gettext('not concerned');
        gettext('Do not concern');
        gettext('No concernment');
        gettext('refered to committee');
        gettext('Refer to committee');
        gettext('Referral to committee');
        gettext('needs review');
        gettext('Needs review');
        gettext('rejected (not authorized)');
        gettext('Reject (not authorized)');
        gettext('Rejection (not authorized)');
    }
]);

}());
