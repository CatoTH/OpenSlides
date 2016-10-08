(function () {

'use strict';

angular.module('OpenSlidesApp.motions.site', [
    'OpenSlidesApp.motions',
    'OpenSlidesApp.motions.diff',
    'OpenSlidesApp.motions.motionservices',
    'OpenSlidesApp.core.pdf',
    'OpenSlidesApp.motions.pdf'
])

.config([
    'mainMenuProvider',
    'gettext',
    function (mainMenuProvider, gettext) {
        mainMenuProvider.register({
            'ui_sref': 'motions.motion.list',
            'img_class': 'file-text',
            'title': gettext('Motions'),
            'weight': 300,
            'perm': 'motions.can_see',
        });
    }
])

.config([
    '$stateProvider',
    function($stateProvider) {
        $stateProvider
            .state('motions', {
                url: '/motions',
                abstract: true,
                template: "<ui-view/>",
            })
            .state('motions.motion', {
                abstract: true,
                template: "<ui-view/>",
            })
            .state('motions.motion.list', {
                resolve: {
                    motions: function(Motion) {
                        return Motion.findAll().then(function(motions) {
                            angular.forEach(motions, function(motion) {
                                Motion.loadRelations(motion, 'agenda_item');
                            });
                        });
                    },
                    categories: function(Category) {
                        return Category.findAll();
                    },
                    tags: function(Tag) {
                        return Tag.findAll();
                    },
                    users: function(User) {
                        return User.findAll().catch(
                            function () {
                                return null;
                            });
                    },
                    workflows: function(Workflow) {
                        return Workflow.findAll();
                    },
                    items: function(Agenda) {
                        return Agenda.findAll().catch(
                            function () {
                                return null;
                            });
                    }
                }
            })
            .state('motions.motion.detail', {
                resolve: {
                    motion: function(Motion, $stateParams) {
                        return Motion.find($stateParams.id);
                    },
                    motions: function(Motion) {
                        return Motion.findAll();
                    },
                    categories: function(Category) {
                        return Category.findAll();
                    },
                    users: function(User) {
                        return User.findAll().catch(
                            function () {
                                return null;
                            }
                        );
                    },
                    items: function(Agenda) {
                        return Agenda.findAll().catch(
                            function () {
                                return null;
                            }
                        );
                    },
                    mediafiles: function(Mediafile) {
                        return Mediafile.findAll().catch(
                            function () {
                                return null;
                            }
                        );
                    },
                    tags: function(Tag) {
                        return Tag.findAll();
                    }
                }
            })
            // redirects to motion detail and opens motion edit form dialog, uses edit url,
            // used by ui-sref links from agenda only
            // (from motion controller use MotionForm factory instead to open dialog in front of
            // current view without redirect)
            .state('motions.motion.detail.update', {
                onEnter: ['$stateParams', '$state', 'ngDialog', 'Motion',
                    function($stateParams, $state, ngDialog, Motion) {
                        ngDialog.open({
                            template: 'static/templates/motions/motion-form.html',
                            controller: 'MotionUpdateCtrl',
                            className: 'ngdialog-theme-default wide-form',
                            closeByEscape: false,
                            closeByDocument: false,
                            resolve: {
                                motion: function() {
                                    return Motion.find($stateParams.id).then(function(motion) {
                                        return Motion.loadRelations(motion, 'agenda_item');
                                    });
                                },
                                items: function(Agenda) {
                                    return Agenda.findAll().catch(
                                        function() {
                                            return null;
                                        }
                                    );
                                }
                            },
                            preCloseCallback: function() {
                                $state.go('motions.motion.detail', {motion: $stateParams.id});
                                return true;
                            }
                        });
                    }
                ]
            })
            .state('motions.motion.import', {
                url: '/import',
                controller: 'MotionImportCtrl',
                resolve: {
                    motions: function(Motion) {
                        return Motion.findAll();
                    },
                    categories: function(Category) {
                        return Category.findAll();
                    },
                    users: function(User) {
                        return User.findAll();
                    }
                }
            })
            // categories
            .state('motions.category', {
                url: '/category',
                abstract: true,
                template: "<ui-view/>",
            })
            .state('motions.category.list', {
                resolve: {
                    categories: function(Category) {
                        return Category.findAll();
                    }
                }
            })
            .state('motions.category.create', {})
            .state('motions.category.detail', {
                resolve: {
                    category: function(Category, $stateParams) {
                        return Category.find($stateParams.id);
                    }
                }
            })
            .state('motions.category.detail.update', {
                views: {
                    '@motions.category': {}
                }
            })
            .state('motions.category.sort', {
                url: '/sort/{id}',
                resolve: {
                    category: function(Category, $stateParams) {
                        return Category.find($stateParams.id);
                    },
                    motions: function(Motion) {
                        return Motion.findAll();
                    }
                },
                controller: 'CategorySortCtrl',
                templateUrl: 'static/templates/motions/category-sort.html'
            });
    }
])

// Load all MotionWorkflows at startup
.run([
    'Workflow',
    function (Workflow) {
        Workflow.findAll();
    }
])

.factory('ChangeRecommendationForm', [
    'gettextCatalog',
    'Editor',
    'Config',
    function(gettextCatalog, Editor, Config) {
        return {
            // ngDialog for motion form
            getCreateDialog: function (motion, version, lineFrom, lineTo) {
                return {
                    template: 'static/templates/motions/change-recommendation-form.html',
                    controller: 'ChangeRecommendationCreateCtrl',
                    className: 'ngdialog-theme-default wide-form',
                    closeByEscape: false,
                    closeByDocument: false,
                    resolve: {
                        motion: function() {
                            return motion;
                        },
                        version: function() {
                            return version;
                        },
                        lineFrom: function() {
                            return lineFrom;
                        },
                        lineTo: function() {
                            return lineTo;
                        }
                    }
                };
            },
            // angular-formly fields for motion form
            getFormFields: function (line_from, line_to) {
                return [
                    {
                        key: 'identifier',
                        type: 'input',
                        templateOptions: {
                            label: gettextCatalog.getString('Identifier')
                        },
                        hide: true
                    },
                    {
                        key: 'motion_version_id',
                        type: 'input',
                        templateOptions: {
                            label: gettextCatalog.getString('Motion')
                        },
                        hide: true
                    },
                    {
                        key: 'line_from',
                        type: 'input',
                        templateOptions: {
                            label: gettextCatalog.getString('From Line')
                        },
                        hide: true
                    },
                    {
                        key: 'line_to',
                        type: 'input',
                        templateOptions: {
                            label: gettextCatalog.getString('To Line')
                        },
                        hide: true
                    },
                    {
                        key: 'type',
                        type: 'radio',
                        templateOptions: {
                            label: gettextCatalog.getString('Type of Change'),
                            options: [
                                {
                                    name: 'Replacement',
                                    value: 0
                                },
                                {
                                    name: 'Insertion',
                                    value: 1
                                },
                                {
                                    name: 'Deletion',
                                    value: 2
                                }
                            ]
                        }
                    },
                    {
                        key: 'text',
                        type: 'editor',
                        templateOptions: {
                            label: (
                                line_from == line_to - 1 ?
                                gettextCatalog.getString('Text in line %from%').replace(/%from%/, line_from) :
                                gettextCatalog.getString('Text from line %from% to %to%')
                                  .replace(/%from%/, line_from).replace(/%to%/, line_to - 1)
                            ),
                            required: false
                        },
                        data: {
                            tinymceOption: Editor.getOptions()
                        }
                    }
                ];
            }
        };
    }
])

// Service for generic motion form (create and update)
.factory('MotionForm', [
    'gettextCatalog',
    'operator',
    'Editor',
    'MotionComment',
    'Category',
    'Config',
    'Mediafile',
    'Tag',
    'User',
    'Workflow',
    'Agenda',
    'AgendaTree',
    function (gettextCatalog, operator, Editor, MotionComment, Category, Config, Mediafile, Tag, User, Workflow, Agenda, AgendaTree) {
        return {
            // ngDialog for motion form
            getDialog: function (motion) {
                var resolve = {};
                if (motion) {
                    resolve = {
                        motion: function() {
                            MotionComment.populateFields(motion);
                            return motion;
                        },
                        agenda_item: function(Motion) {
                            return Motion.loadRelations(motion, 'agenda_item');
                        }
                    };
                }
                resolve.mediafiles = function (Mediafile) {
                        return Mediafile.findAll();
                };
                return {
                    template: 'static/templates/motions/motion-form.html',
                    controller: (motion) ? 'MotionUpdateCtrl' : 'MotionCreateCtrl',
                    className: 'ngdialog-theme-default wide-form',
                    closeByEscape: false,
                    closeByDocument: false,
                    resolve: (resolve) ? resolve : null
                };
            },
            // angular-formly fields for motion form
            getFormFields: function () {
                var workflows = Workflow.getAll();
                var images = Mediafile.getAllImages();
                var formFields = [
                {
                    key: 'identifier',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Identifier')
                    },
                    hide: true
                },
                {
                    key: 'submitters_id',
                    type: 'select-multiple',
                    templateOptions: {
                        label: gettextCatalog.getString('Submitters'),
                        options: User.getAll(),
                        ngOptions: 'option.id as option.full_name for option in to.options',
                        placeholder: gettextCatalog.getString('Select or search a submitter ...')
                    },
                    hide: !operator.hasPerms('motions.can_manage')
                },
                {
                    key: 'title',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Title'),
                        required: true
                    }
                },
                {
                    key: 'text',
                    type: 'editor',
                    templateOptions: {
                        label: gettextCatalog.getString('Text'),
                        required: true
                    },
                    data: {
                        tinymceOption: Editor.getOptions(images)
                    }
                },
                {
                    key: 'reason',
                    type: 'editor',
                    templateOptions: {
                        label: gettextCatalog.getString('Reason'),
                    },
                    data: {
                        tinymceOption: Editor.getOptions(images)
                    }
                },
                {
                    key: 'disable_versioning',
                    type: 'checkbox',
                    templateOptions: {
                        label: gettextCatalog.getString('Trivial change'),
                        description: gettextCatalog.getString("Don't create a new version.")
                    },
                    hide: true
                },
                {
                    key: 'showAsAgendaItem',
                    type: 'checkbox',
                    templateOptions: {
                        label: gettextCatalog.getString('Show as agenda item'),
                        description: gettextCatalog.getString('If deactivated the motion appears as internal item on agenda.')
                    },
                    hide: !operator.hasPerms('motions.can_manage')
                },
                {
                    key: 'agenda_parent_item_id',
                    type: 'select-single',
                    templateOptions: {
                        label: gettextCatalog.getString('Parent item'),
                        options: AgendaTree.getFlatTree(Agenda.getAll()),
                        ngOptions: 'item.id as item.getListViewTitle() for item in to.options | notself : model.agenda_item_id',
                        placeholder: gettextCatalog.getString('Select a parent item ...')
                    },
                    hide: !operator.hasPerms('agenda.can_manage')
                }]
                .concat(MotionComment.getFormFields())
                .concat([
                {
                    key: 'more',
                    type: 'checkbox',
                    templateOptions: {
                        label: gettextCatalog.getString('Show extended fields')
                    },
                    hide: !operator.hasPerms('motions.can_manage')
                },
                {
                    key: 'attachments_id',
                    type: 'select-multiple',
                    templateOptions: {
                        label: gettextCatalog.getString('Attachment'),
                        options: Mediafile.getAll(),
                        ngOptions: 'option.id as option.title_or_filename for option in to.options',
                        placeholder: gettextCatalog.getString('Select or search an attachment ...')
                    },
                    hideExpression: '!model.more'
                },
                {
                    key: 'category_id',
                    type: 'select-single',
                    templateOptions: {
                        label: gettextCatalog.getString('Category'),
                        options: Category.getAll(),
                        ngOptions: 'option.id as option.name for option in to.options',
                        placeholder: gettextCatalog.getString('Select or search a category ...')
                    },
                    hideExpression: '!model.more'
                },
                {
                    key: 'origin',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Origin'),
                    },
                    hideExpression: '!model.more'
                },
                {
                    key: 'tags_id',
                    type: 'select-multiple',
                    templateOptions: {
                        label: gettextCatalog.getString('Tags'),
                        options: Tag.getAll(),
                        ngOptions: 'option.id as option.name for option in to.options',
                        placeholder: gettextCatalog.getString('Select or search a tag ...')
                    },
                    hideExpression: '!model.more'
                },
                {
                    key: 'supporters_id',
                    type: 'select-multiple',
                    templateOptions: {
                        label: gettextCatalog.getString('Supporters'),
                        options: User.getAll(),
                        ngOptions: 'option.id as option.full_name for option in to.options',
                        placeholder: gettextCatalog.getString('Select or search a supporter ...')
                    },
                    hideExpression: '!model.more'
                }]);

                if (workflows.length > 1) {
                    formFields = formFields.concat([
                        {
                            key: 'workflow_id',
                            type: 'select-single',
                            templateOptions: {
                                label: gettextCatalog.getString('Workflow'),
                                optionsAttr: 'bs-options',
                                options: workflows,
                                ngOptions: 'option.id as option.name | translate for option in to.options',
                                placeholder: gettextCatalog.getString('Select or search a workflow ...')
                            },
                            hideExpression: '!model.more',
                        }
                    ]);
                }

                return formFields;
            }
        };
    }
])

// Provide generic motionpoll form fields for poll update view
.factory('MotionPollForm', [
    'gettextCatalog',
    function (gettextCatalog) {
        return {
            getFormFields: function () {
                return [
                {
                    key: 'yes',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Yes'),
                        type: 'number',
                        required: true
                    }
                },
                {
                    key: 'no',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('No'),
                        type: 'number',
                        required: true
                    }
                },
                {
                    key: 'abstain',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Abstain'),
                        type: 'number',
                        required: true
                    }
                },
                {
                    key: 'votesvalid',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Valid ballots'),
                        type: 'number'
                    }
                },
                {
                    key: 'votesinvalid',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Invalid ballots'),
                        type: 'number'
                    }
                },
                {
                    key: 'votescast',
                    type: 'input',
                    templateOptions: {
                        label: gettextCatalog.getString('Casted ballots'),
                        type: 'number'
                    }
                }];
            }
        };
    }
])

.controller('MotionListCtrl', [
    '$scope',
    '$state',
    '$http',
    'ngDialog',
    'MotionForm',
    'Motion',
    'Category',
    'Tag',
    'Workflow',
    'User',
    'Agenda',
    'MotionDocxExport',
    'MotionContentProvider',
    'MotionCatalogContentProvider',
    'PdfMakeConverter',
    'PdfMakeDocumentProvider',
    'gettextCatalog',
    'HTMLValidizer',
    'Projector',
    'ProjectionDefault',
    function($scope, $state, $http, ngDialog, MotionForm, Motion, Category, Tag, Workflow, User, Agenda, MotionDocxExport,
                MotionContentProvider, MotionCatalogContentProvider, PdfMakeConverter, PdfMakeDocumentProvider,
                gettextCatalog, HTMLValidizer, Projector, ProjectionDefault) {
        Motion.bindAll({}, $scope, 'motions');
        Category.bindAll({}, $scope, 'categories');
        Tag.bindAll({}, $scope, 'tags');
        Workflow.bindAll({}, $scope, 'workflows');
        User.bindAll({}, $scope, 'users');
        Projector.bindAll({}, $scope, 'projectors');
        $scope.$watch(function () {
            return Projector.lastModified();
        }, function () {
            var projectiondefault = ProjectionDefault.filter({name: 'motions'})[0];
            if (projectiondefault) {
                $scope.defaultProjectorId = projectiondefault.projector_id;
            }
        });
        $scope.alert = {};

        // setup table sorting
        $scope.sortColumn = 'identifier';
        $scope.filterPresent = '';
        $scope.reverse = false;

        $scope.multiselectFilter = {
            state: [],
            category: [],
            tag: []
        };
        $scope.getItemId = {
            state: function (motion) {return motion.state_id;},
            category: function (motion) {return motion.category_id;},
            tag: function (motion) {return motion.tags_id;}
        };
        // function to operate the multiselectFilter
        $scope.operateMultiselectFilter = function (filter, id) {
            if (!$scope.isDeleteMode) {
                if (_.indexOf($scope.multiselectFilter[filter], id) > -1) {
                    // remove id
                    $scope.multiselectFilter[filter] = _.filter($scope.multiselectFilter[filter], function (_id) {
                        return _id != id;
                    });
                } else {
                    // add id
                    $scope.multiselectFilter[filter].push(id);
                }
            }
        };
        // function to sort by clicked column
        $scope.toggleSort = function (column) {
            if ( $scope.sortColumn === column ) {
                $scope.reverse = !$scope.reverse;
            }
            $scope.sortColumn = column;
        };
        // define custom search filter string
        $scope.getFilterString = function (motion) {
            var category = '';
            if (motion.category) {
                category = motion.category.name;
            }
            return [
                motion.identifier,
                motion.getTitle(),
                motion.getText(),
                motion.getReason(),
                motion.origin,
                _.map(
                    motion.submitters,
                    function (submitter) {
                        return submitter.get_short_name();
                    }
                ).join(" "),
                _.map(
                    motion.supporters,
                    function (supporter) {
                        return supporter.get_short_name();
                    }
                ).join(" "),
                _.map(
                    motion.tags,
                    function (tag) {
                        return tag.name;
                    }
                ).join(" "),
                category,
            ].join(" ");
        };
        // for reset-button
        $scope.reset_filters = function () {
            $scope.multiselectFilter = {
                state: [],
                category: [],
                tag: []
            };
            if ($scope.filter) {
                $scope.filter.search = '';
            }
        };
        $scope.are_filters_set = function () {
            return $scope.multiselectFilter.state.length > 0 ||
                   $scope.multiselectFilter.category.length > 0 ||
                   $scope.multiselectFilter.tag.length > 0 ||
                   ($scope.filter ? $scope.filter.search : false);
        };

        // collect all states of all workflows
        // TODO: regard workflows only which are used by motions
        $scope.states = [];
        var workflows = Workflow.getAll();
        angular.forEach(workflows, function (workflow) {
            if (workflows.length > 1) {
                var wf = {};
                wf.name = workflow.name;
                wf.workflowHeader = true;
                $scope.states.push(wf);
            }
            angular.forEach(workflow.states, function (state) {
                $scope.states.push(state);
            });
        });

        // update state
        $scope.updateState = function (motion, state_id) {
            $http.put('/rest/motions/motion/' + motion.id + '/set_state/', {'state': state_id});
        };
        // reset state
        $scope.reset_state = function (motion) {
            $http.put('/rest/motions/motion/' + motion.id + '/set_state/', {});
        };

        $scope.has_tag = function (motion, tag) {
            return _.indexOf(motion.tags_id, tag.id) > -1;
        };

        // Use this methon instead of Motion.save(), because otherwise
        // you have to provide always a title and a text
        var save = function (motion) {
            motion.title = motion.getTitle(-1);
            motion.text = motion.getText(-1);
            motion.reason = motion.getReason(-1);
            Motion.save(motion);
        };
        $scope.toggle_tag = function (motion, tag) {
            if ($scope.has_tag(motion, tag)) {
                // remove
                motion.tags_id = _.filter(motion.tags_id, function (tag_id){
                    return tag_id != tag.id;
                });
            } else {
                motion.tags_id.push(tag.id);
            }
            save(motion);
        };
        $scope.toggle_category = function (motion, category) {
            if (motion.category_id == category.id) {
                motion.category_id = null;
            } else {
                motion.category_id = category.id;
            }
            save(motion);
        };

        // open new/edit dialog
        $scope.openDialog = function (motion) {
            ngDialog.open(MotionForm.getDialog(motion));
        };


        // Export as a pdf file
        $scope.pdf_export = function() {

            var filename = gettextCatalog.getString("Motions") + ".pdf";
            var image_sources = [];

            //save the arrays of the filtered motions to an array
            angular.forEach($scope.motionsFiltered, function (motion) {
                var content = HTMLValidizer.validize(motion.getText($scope.version)) + HTMLValidizer.validize(motion.getReason($scope.version));
                var map = Function.prototype.call.bind([].map);
                var tmp_image_sources = map($(content).find("img"), function(element) {
                    return element.getAttribute("src");
                });
                image_sources = image_sources.concat(tmp_image_sources);
            });

            //post-request to convert the images. Async.
            $http.post('/core/encode_media/', JSON.stringify(image_sources)).success(function(data) {
                var converter = PdfMakeConverter.createInstance(data.images, data.fonts, pdfMake);
                var motionContentProviderArray = [];

                //convert the filtered motions to motionContentProviders
                angular.forEach($scope.motionsFiltered, function (motion) {
                    motionContentProviderArray.push(MotionContentProvider.createInstance(converter, motion, $scope, User, $http));
                });
                var motionCatalogContentProvider = MotionCatalogContentProvider.createInstance(motionContentProviderArray, $scope, User, Category);
                var documentProvider = PdfMakeDocumentProvider.createInstance(motionCatalogContentProvider, data.defaultFont);
                pdfMake.createPdf(documentProvider.getDocument()).download(filename);
            });
        };

        // Export as a csv file
        $scope.csv_export = function () {
            var element = document.getElementById('downloadLinkCSV');
            var csvRows = [
                ['identifier', 'title', 'text', 'reason', 'submitter', 'category', 'origin'],
            ];
            angular.forEach($scope.motionsFiltered, function (motion) {
                var row = [];
                row.push('"' + motion.identifier + '"');
                row.push('"' + motion.getTitle() + '"');
                row.push('"' + motion.getText() + '"');
                row.push('"' + motion.getReason() + '"');
                row.push('"' + motion.submitters[0].get_full_name() + '"');
                var category = motion.category ? motion.category.name : '';
                row.push('"' + category + '"');
                row.push('"' + motion.origin + '"');
                csvRows.push(row);
            });

            var csvString = csvRows.join("%0A");
            element.href = 'data:text/csv;charset=utf-8,' + csvString;
            element.download = 'motions-export.csv';
            element.target = '_blank';
        };
        // Export as docx file
        $scope.docx_export = function () {
            MotionDocxExport.export($scope.motionsFiltered, $scope.categories);
        };

        // *** delete mode functions ***
        $scope.isDeleteMode = false;
        // check all checkboxes from filtered motions
        $scope.checkAll = function () {
            $scope.selectedAll = !$scope.selectedAll;
            angular.forEach($scope.motionsFiltered, function (motion) {
                motion.selected = $scope.selectedAll;
            });
        };
        // uncheck all checkboxes if isDeleteMode is closed
        $scope.uncheckAll = function () {
            if (!$scope.isDeleteMode) {
                $scope.selectedAll = false;
                angular.forEach($scope.motions, function (motion) {
                    motion.selected = false;
                });
            }
        };
        // delete selected motions
        $scope.deleteMultiple = function () {
            angular.forEach($scope.motionsFiltered, function (motion) {
                if (motion.selected)
                    Motion.destroy(motion.id);
            });
            $scope.isDeleteMode = false;
            $scope.uncheckAll();
        };
        // delete single motion
        $scope.delete = function (motion) {
            Motion.destroy(motion.id);
        };
    }
])

.controller('MotionDetailCtrl', [
    '$scope',
    '$http',
    'operator',
    'ngDialog',
    'MotionForm',
    'ChangeRecommmendationCreate',
    'ChangeRecommmendationView',
    'MotionChangeRecommendation',
    'Motion',
    'Category',
    'Mediafile',
    'Tag',
    'User',
    'Workflow',
    'Config',
    'motion',
    'MotionContentProvider',
    'PollContentProvider',
    'PdfMakeConverter',
    'PdfMakeDocumentProvider',
    'MotionInlineEditing',
    'gettextCatalog',
    'Projector',
    'HTMLValidizer',
    'ProjectionDefault',
    function($scope, $http, operator, ngDialog, MotionForm,
             ChangeRecommmendationCreate, ChangeRecommmendationView, MotionChangeRecommendation,
             Motion, Category, Mediafile, Tag, User, Workflow, Config, motion, MotionContentProvider,
             PollContentProvider, PdfMakeConverter, PdfMakeDocumentProvider, MotionInlineEditing, gettextCatalog,
             Projector, HTMLValidizer, ProjectionDefault) {
        Motion.bindOne(motion.id, $scope, 'motion');
        Category.bindAll({}, $scope, 'categories');
        Mediafile.bindAll({}, $scope, 'mediafiles');
        Tag.bindAll({}, $scope, 'tags');
        User.bindAll({}, $scope, 'users');
        Workflow.bindAll({}, $scope, 'workflows');
        MotionChangeRecommendation.bindAll({}, $scope, 'change_recommendations');
        MotionChangeRecommendation.findAll();
        Motion.loadRelations(motion, 'agenda_item');
        $scope.$watch(function () {
            return Projector.lastModified();
        }, function () {
            $scope.defaultProjectorId = ProjectionDefault.filter({name: 'motions'})[0].projector_id;
        });
        $scope.version = motion.active_version;
        $scope.isCollapsed = true;
        $scope.commentsFields = Config.get('motions_comments').value;

        $scope.lineNumberMode = Config.get('motions_default_line_numbering').value;
        $scope.setLineNumberMode = function(mode) {
            $scope.lineNumberMode = mode;
        };

        if (motion.parent_id) {
            Motion.bindOne(motion.parent_id, $scope, 'parent');
        }
        $scope.amendments = Motion.filter({parent_id: motion.id});

        $scope.highlight = 0;
        $scope.linesForProjector = false;
        // Set 0 for disable highlighting on projector
        var setHighlightOnProjector = function (line) {
            var elements = _.map(Projector.get(1).elements, function(element) { return element; });
            elements.forEach(function (element) {
                if (element.name == 'motions/motion') {
                    var data = {};
                    data[element.uuid] = {
                        highlightAndScroll: line,
                    };
                    $http.post('/rest/core/projector/1/update_elements/', data);
                }
            });
        };
        $scope.scrollToAndHighlight = function (line) {
            $scope.highlight = line;
            var lineElement = document.getElementsByName('L' + line);
            if (lineElement[0]) {
                // Scroll local
                $('html, body').animate({
                    scrollTop: lineElement[0].getBoundingClientRect().top
                }, 1000);
            }
            // set highlight and scroll on Projector
            setHighlightOnProjector($scope.linesForProjector ? line : 0);
        };
        $scope.toggleLinesForProjector = function () {
            $scope.linesForProjector = !$scope.linesForProjector;
            setHighlightOnProjector($scope.linesForProjector ? $scope.highlight : 0);
        };

        $scope.makePDF = function() {
            var content = HTMLValidizer.validize(motion.getText($scope.version)) + HTMLValidizer.validize(motion.getReason($scope.version));
            var map = Function.prototype.call.bind([].map);
            var image_sources = map($(content).find("img"), function(element) {
                return element.getAttribute("src");
            });

            $http.post('/core/encode_media/', JSON.stringify(image_sources)).success(function(data) {
                var converter = PdfMakeConverter.createInstance(data.images, data.fonts, pdfMake);
                var motionContentProvider = MotionContentProvider.createInstance(converter, motion, $scope, User, $http);
                var documentProvider = PdfMakeDocumentProvider.createInstance(motionContentProvider, data.defaultFont);
                var filename = gettextCatalog.getString("Motion") + "-" + motion.identifier + ".pdf";
                pdfMake.createPdf(documentProvider.getDocument()).download(filename);
            });
        };

        //make PDF for polls
        $scope.makePollPDF = function() {
            var id = motion.identifier.replace(" ", ""),
                title = motion.getTitle($scope.version),
                filename = gettextCatalog.getString("Motion") + "-" + id + "-" + gettextCatalog.getString("ballot-paper") + ".pdf",
                content = PollContentProvider.createInstance(title, id, gettextCatalog);
            pdfMake.createPdf(content).download(filename);
        };

        // open edit dialog
        $scope.openDialog = function (motion) {
            if ($scope.inlineEditing.active) {
                $scope.disableInlineEditing();
            }
            ngDialog.open(MotionForm.getDialog(motion));
        };
        // support
        $scope.support = function () {
            $http.post('/rest/motions/motion/' + motion.id + '/support/');
        };
        // unsupport
        $scope.unsupport = function () {
            $http.delete('/rest/motions/motion/' + motion.id + '/support/');
        };
        // open dialog for new amendment
        $scope.newAmendment = function () {
            var dialog = MotionForm.getDialog();
            if (dialog.scope === undefined) {
                dialog.scope = {};
            }
            dialog.scope = $scope;
            ngDialog.open(dialog);
        };
        // update state
        $scope.updateState = function (state_id) {
            $http.put('/rest/motions/motion/' + motion.id + '/set_state/', {'state': state_id});
        };
        // reset state
        $scope.reset_state = function () {
            $http.put('/rest/motions/motion/' + motion.id + '/set_state/', {});
        };
        // update recommendation
        $scope.updateRecommendation = function (recommendation_id) {
            $http.put('/rest/motions/motion/' + motion.id + '/set_recommendation/', {'recommendation': recommendation_id});
        };
        // reset state
        $scope.resetRecommendation = function () {
            $http.put('/rest/motions/motion/' + motion.id + '/set_recommendation/', {});
        };
        // create poll
        $scope.create_poll = function () {
            $http.post('/rest/motions/motion/' + motion.id + '/create_poll/', {});
        };
        // open poll update dialog
        $scope.openPollDialog = function (poll, voteNumber) {
            ngDialog.open({
                template: 'static/templates/motions/motionpoll-form.html',
                controller: 'MotionPollUpdateCtrl',
                className: 'ngdialog-theme-default',
                closeByEscape: false,
                closeByDocument: false,
                resolve: {
                    motionpoll: function (MotionPoll) {
                        return MotionPoll.find(poll.id);
                    },
                    voteNumber: function () {
                        return voteNumber;
                    }
                }
            });
        };
        // delete poll
        $scope.delete_poll = function (poll) {
            poll.DSDestroy();
        };
        // show specific version
        $scope.showVersion = function (version) {
            $scope.version = version.id;
            $scope.inlineEditing.setVersion(motion, version.id);
            $scope.createChangeRecommendation.setVersion(motion, version.id);
        };
        // permit specific version
        $scope.permitVersion = function (version) {
            $http.put('/rest/motions/motion/' + motion.id + '/manage_version/',
                {'version_number': version.version_number})
                .then(function(success) {
                    $scope.showVersion(version);
                });
        };
        // delete specific version
        $scope.deleteVersion = function (version) {
            $http.delete('/rest/motions/motion/' + motion.id + '/manage_version/',
                    {headers: {'Content-Type': 'application/json'},
                     data: JSON.stringify({version_number: version.version_number})})
                .then(function(success) {
                    $scope.showVersion(motion.active_version);
                });
        };
        // check if user is allowed to see at least one comment field
        $scope.isAllowedToSeeCommentField = function () {
            var isAllowed = false;
            if ($scope.commentsFields.length > 0) {
                isAllowed = operator.hasPerms('motions.can_see_and_manage_comments') || _.find(
                        $scope.commentsFields,
                        function(field) {
                            return field.public;
                        }
                );
            }
            return Boolean(isAllowed);
        };

        // Inline editing functions
        $scope.inlineEditing = MotionInlineEditing;
        $scope.inlineEditing.init($scope, motion);

        // Change Recommendation creation functions
        $scope.createChangeRecommendation = ChangeRecommmendationCreate;
        $scope.createChangeRecommendation.init(motion, $scope);

        // Change Recommendation viewing
        $scope.viewChangeRecommendations = ChangeRecommmendationView;
        $scope.viewChangeRecommendations.init($scope);
    }
])

.controller('ChangeRecommendationCreateCtrl', [
    '$scope',
    'Motion',
    'MotionChangeRecommendation',
    'ChangeRecommendationForm',
    'Config',
    'diffService',
    'motion',
    'version',
    'lineFrom',
    'lineTo',
    function($scope, Motion, MotionChangeRecommendation, ChangeRecommendationForm, Config, diffService, motion,
             version, lineFrom, lineTo) {
        $scope.alert = {};

        var html = motion.getTextWithLineBreaks(version),
            fragment = diffService.htmlToFragment(html),
            lineData = diffService.extractRangeByLineNumbers(fragment, lineFrom, lineTo);

        $scope.model = {
            text: lineData.outerContextStart + lineData.innerContextStart +
                lineData.html + lineData.innerContextEnd + lineData.outerContextEnd,
            line_from: lineFrom,
            line_to: lineTo,
            motion_version_id: version,
            type: 0
        };

        // get all form fields
        $scope.formFields = ChangeRecommendationForm.getFormFields(lineFrom, lineTo);
        // save motion
        $scope.save = function (motion) {
            MotionChangeRecommendation.create(motion).then(
                function(success) {
                    console.log("success");
                    $scope.closeThisDialog();
                }
            );
        };
    }
])

.controller('MotionCreateCtrl', [
    '$scope',
    '$state',
    'gettext',
    'gettextCatalog',
    'operator',
    'Motion',
    'MotionForm',
    'Category',
    'Config',
    'Mediafile',
    'Tag',
    'User',
    'Workflow',
    'Agenda',
    'AgendaUpdate',
    function($scope, $state, gettext, gettextCatalog, operator, Motion, MotionForm, Category, Config, Mediafile, Tag, User, Workflow, Agenda, AgendaUpdate) {
        Category.bindAll({}, $scope, 'categories');
        Mediafile.bindAll({}, $scope, 'mediafiles');
        Tag.bindAll({}, $scope, 'tags');
        User.bindAll({}, $scope, 'users');
        Workflow.bindAll({}, $scope, 'workflows');

        $scope.model = {};

        // Check whether this is a new amendment.
        var isAmendment = $scope.$parent.motion && $scope.$parent.motion.id;

        // Set default values for create form
        // ... set preamble config value as text
        $scope.model.text = gettextCatalog.getString(Config.get('motions_preamble').value);
        // ... for amendments add parent_id
        if (isAmendment) {
            if (Config.get('motions_amendments_apply_title_text').value) {
                $scope.model.title = $scope.$parent.motion.getTitle();
                $scope.model.text = $scope.$parent.motion.getText();
            }
            $scope.model.parent_id = $scope.$parent.motion.id;
            Motion.bindOne($scope.model.parent_id, $scope, 'parent');
        }
        // ... preselect default workflow
        $scope.model.workflow_id = Config.get('motions_workflow').value;
        // get all form fields
        $scope.formFields = MotionForm.getFormFields();

        // save motion
        $scope.save = function (motion) {
            Motion.create(motion).then(
                function(success) {
                    // change agenda item only if user has the permission to do that
                    if (operator.hasPerms('agenda.can_manage')) {
                        // type: Value 1 means a non hidden agenda item, value 2 means a hidden agenda item,
                        // see openslides.agenda.models.Item.ITEM_TYPE.
                        var changes = [{key: 'type', value: (motion.showAsAgendaItem ? 1 : 2)},
                                       {key: 'parent_id', value: motion.agenda_parent_item_id}];
                        AgendaUpdate.saveChanges(success.agenda_item_id, changes);
                    }
                    if (isAmendment) {
                        $state.go('motions.motion.detail', {id: success.id});
                    }
                    $scope.closeThisDialog();
                }
            );
        };
    }
])

.controller('MotionUpdateCtrl', [
    '$scope',
    'Motion',
    'Category',
    'Config',
    'Mediafile',
    'MotionForm',
    'Tag',
    'User',
    'Workflow',
    'Agenda',
    'AgendaUpdate',
    'motion',
    function($scope, Motion, Category, Config, Mediafile, MotionForm, Tag, User, Workflow, Agenda, AgendaUpdate, motion) {
        Category.bindAll({}, $scope, 'categories');
        Mediafile.bindAll({}, $scope, 'mediafiles');
        Tag.bindAll({}, $scope, 'tags');
        User.bindAll({}, $scope, 'users');
        Workflow.bindAll({}, $scope, 'workflows');
        $scope.alert = {};

        // set initial values for form model by create deep copy of motion object
        // so list/detail view is not updated while editing
        $scope.model = angular.copy(motion);
        $scope.model.more = false;

        // get all form fields
        $scope.formFields = MotionForm.getFormFields();
        // override default values for update form
        for (var i = 0; i < $scope.formFields.length; i++) {
            if ($scope.formFields[i].key == "identifier") {
                // show identifier field
               $scope.formFields[i].hide = false;
            }
            if ($scope.formFields[i].key == "title") {
                // get title of latest version
                $scope.formFields[i].defaultValue = motion.getTitle(-1);
            }
            if ($scope.formFields[i].key == "text") {
                // get text of latest version
                $scope.formFields[i].defaultValue = motion.getText(-1);
            }
            if ($scope.formFields[i].key == "reason") {
                // get reason of latest version
                $scope.formFields[i].defaultValue = motion.getReason(-1);
            }
            if ($scope.formFields[i].key == "disable_versioning" &&
                Config.get('motions_allow_disable_versioning')) {
                // check current state if versioning is active
                if (motion.state.versioning) {
                    $scope.formFields[i].hide = false;
                }
            }
            if ($scope.formFields[i].key == "showAsAgendaItem") {
                // get state from agenda item (hidden/internal or agenda item)
                $scope.formFields[i].defaultValue = !motion.agenda_item.is_hidden;
            }
            if ($scope.formFields[i].key == "workflow_id") {
               // get saved workflow id from state
               $scope.formFields[i].defaultValue = motion.state.workflow_id;
            }
            if ($scope.formFields[i].key == "agenda_parent_item_id") {
                // get current parent_id of the agenda item
                $scope.formFields[i].defaultValue = motion.agenda_item.parent_id;
            }
        }

        // save motion
        $scope.save = function (motion) {
            // inject the changed motion (copy) object back into DS store
            Motion.inject(motion);
            // save change motion object on server
            Motion.save(motion, { method: 'PATCH' }).then(
                function(success) {
                    Agenda.find(success.agenda_item_id).then(function(item) {
                        // type: Value 1 means a non hidden agenda item, value 2 means a hidden agenda item,
                        // see openslides.agenda.models.Item.ITEM_TYPE.
                        var changes = [{key: 'type', value: (motion.showAsAgendaItem ? 1 : 2)},
                                       {key: 'parent_id', value: motion.agenda_parent_item_id}];
                        AgendaUpdate.saveChanges(success.agenda_item_id,changes);
                        $scope.closeThisDialog();
                    });
                },
                function (error) {
                    // save error: revert all changes by restore
                    // (refresh) original motion object from server
                    Motion.refresh(motion);
                    var message = '';
                    for (var e in error.data) {
                        message += e + ': ' + error.data[e] + ' ';
                    }
                    $scope.alert = {type: 'danger', msg: message, show: true};
                }
            );
        };
    }
])

.controller('MotionPollUpdateCtrl', [
    '$scope',
    'gettextCatalog',
    'MotionPoll',
    'MotionPollForm',
    'motionpoll',
    'voteNumber',
    function($scope, gettextCatalog, MotionPoll, MotionPollForm, motionpoll, voteNumber) {
        // set initial values for form model by create deep copy of motionpoll object
        // so detail view is not updated while editing poll
        $scope.model = angular.copy(motionpoll);
        $scope.voteNumber = voteNumber;
        $scope.formFields = MotionPollForm.getFormFields();
        $scope.alert = {};

        // save motionpoll
        $scope.save = function (poll) {
            poll.DSUpdate({
                    motion_id: poll.motion_id,
                    votes: {"Yes": poll.yes, "No": poll.no, "Abstain": poll.abstain},
                    votesvalid: poll.votesvalid,
                    votesinvalid: poll.votesinvalid,
                    votescast: poll.votescast
            })
            .then(function(success) {
                $scope.alert.show = false;
                $scope.closeThisDialog();
            })
            .catch(function(error) {
                var message = '';
                for (var e in error.data) {
                    message += e + ': ' + error.data[e] + ' ';
                }
                $scope.alert = { type: 'danger', msg: message, show: true };
            });
        };
    }
])

.controller('MotionImportCtrl', [
    '$scope',
    '$q',
    'gettext',
    'Category',
    'Motion',
    'User',
    function($scope, $q, gettext, Category, Motion, User) {
        // set initial data for csv import
        $scope.motions = [];
        $scope.separator = ',';
        $scope.encoding = 'UTF-8';
        $scope.encodingOptions = ['UTF-8', 'ISO-8859-1'];
        $scope.accept = '.csv, .txt';
        $scope.csv = {
            content: null,
            header: true,
            headerVisible: false,
            separator: $scope.separator,
            separatorVisible: false,
            encoding: $scope.encoding,
            encodingVisible: false,
            accept: $scope.accept,
            result: null
        };
        // set csv file encoding
        $scope.setEncoding = function () {
            $scope.csv.encoding = $scope.encoding;
        };
        // set csv file encoding
        $scope.setSeparator = function () {
            $scope.csv.separator = $scope.separator;
        };
        // detect if csv file is loaded
        $scope.$watch('csv.result', function () {
            $scope.motions = [];
            var quotionRe = /^"(.*)"$/;
            angular.forEach($scope.csv.result, function (motion) {
                if (motion.identifier) {
                    motion.identifier = motion.identifier.replace(quotionRe, '$1');
                    if (motion.identifier !== '') {
                        // All motion objects are already loaded via the resolve statement from ui-router.
                        var motions = Motion.getAll();
                        if (_.find(motions, function (item) {
                            return item.identifier == motion.identifier;
                        })) {
                            motion.importerror = true;
                            motion.identifier_error = gettext('Error: Identifier already exists.');
                        }
                    }
                }
                // title
                if (motion.title) {
                    motion.title = motion.title.replace(quotionRe, '$1');
                }
                if (!motion.title) {
                    motion.importerror = true;
                    motion.title_error = gettext('Error: Title is required.');
                }
                // text
                if (motion.text) {
                    motion.text = motion.text.replace(quotionRe, '$1');
                }
                if (!motion.text) {
                    motion.importerror = true;
                    motion.text_error = gettext('Error: Text is required.');
                }
                // reason
                if (motion.reason) {
                    motion.reason = motion.reason.replace(quotionRe, '$1');
                }
                // submitter
                if (motion.submitter) {
                    motion.submitter = motion.submitter.replace(quotionRe, '$1');
                    if (motion.submitter !== '') {
                        // All user objects are already loaded via the resolve statement from ui-router.
                        var users = User.getAll();
                        angular.forEach(users, function (user) {
                            if (user.short_name == motion.submitter) {
                                motion.submitters_id = [user.id];
                                motion.submitter = User.get(user.id).full_name;
                            }
                        });
                    }
                }
                if (motion.submitter && motion.submitter !== '' && !motion.submitters_id) {
                    motion.submitter_create = gettext('New participant will be created.');
                }
                // category
                if (motion.category) {
                    motion.category = motion.category.replace(quotionRe, '$1');
                    if (motion.category !== '') {
                        // All categore objects are already loaded via the resolve statement from ui-router.
                        var categories = Category.getAll();
                        angular.forEach(categories, function (category) {
                            // search for existing category
                            if (category.name == motion.category) {
                                motion.category_id = category.id;
                                motion.category = Category.get(category.id).name;
                            }
                        });
                    }
                }
                if (motion.category && motion.category !== '' && !motion.category_id) {
                    motion.category_create = gettext('New category will be created.');
                }
                // origin
                if (motion.origin) {
                    motion.origin = motion.origin.replace(quotionRe, '$1');
                }
                $scope.motions.push(motion);
            });
        });

        // Counter for creations
        $scope.usersCreated = 0;
        $scope.categoriesCreated = 0;

        // import from csv file
        $scope.import = function () {
            $scope.csvImporting = true;

            // Reset counters
            $scope.usersCreated = 0;
            $scope.categoriesCreated = 0;

            var importedUsers = [];
            var importedCategories = [];
            // collect users and categories
            angular.forEach($scope.motions, function (motion) {
                if (!motion.importerror) {
                    // collect user if not exists
                    if (!motion.submitters_id && motion.submitter) {
                        var index = motion.submitter.indexOf(' ');
                        var user = {
                            first_name: motion.submitter.substr(0, index),
                            last_name: motion.submitter.substr(index+1),
                            groups_id: []
                        };
                        importedUsers.push(user);
                    }
                    // collect category if not exists
                    if (!motion.category_id && motion.category) {
                        var category = {
                            name: motion.category,
                            prefix: motion.category.charAt(0)
                        };
                        importedCategories.push(category);
                    }
                }
            });

            // unique users and categories
            var importedUsersUnique = _.uniqWith(importedUsers, function (u1, u2) {
                return u1.first_name == u2.first_name &&
                    u1.last_name == u2.last_name;
            });
            var importedCategoriesUnique = _.uniqWith(importedCategories, function (c1, c2) {
                return c1.name == c2.name;
            });

            // Promises for users and categories
            var createPromises = [];

            // create users and categories
            importedUsersUnique.forEach(function (user) {
                createPromises.push(User.create(user).then(
                    function (success) {
                        user.id = success.id;
                        $scope.usersCreated++;
                    }
                ));
            });
            importedCategoriesUnique.forEach(function (category) {
                createPromises.push(Category.create(category).then(
                    function (success) {
                        category.id = success.id;
                        $scope.categoriesCreated++;
                    }
                ));
            });

            // wait for users and categories to create
            $q.all(createPromises).then( function() {
                angular.forEach($scope.motions, function (motion) {
                    if (!motion.importerror) {
                        // now, add user
                        if (!motion.submitters_id && motion.submitter) {
                            var index = motion.submitter.indexOf(' ');
                            var first_name = motion.submitter.substr(0, index);
                            var last_name = motion.submitter.substr(index+1);

                            // search for user, set id.
                            importedUsersUnique.forEach(function (user) {
                                if (user.first_name == first_name &&
                                    user.last_name == last_name) {
                                    motion.submitters_id = [user.id];
                                }
                            });
                        }
                        // add category
                        if (!motion.category_id && motion.category) {
                            var name = motion.category;

                            // search for category, set id.
                            importedCategoriesUnique.forEach(function (category) {
                                if (category.name == name) {
                                    motion.category_id = category.id;
                                }
                            });
                        }

                        // finally create motion
                        Motion.create(motion).then(
                            function(success) {
                                motion.imported = true;
                            }
                        );
                    }
                });
            });
            $scope.csvimported = true;
        };
        $scope.clear = function () {
            $scope.csv.result = null;
        };
        // download CSV example file
        $scope.downloadCSVExample = function () {
            var element = document.getElementById('downloadLink');
            var csvRows = [
                // column header line
                ['identifier', 'title', 'text', 'reason', 'submitter', 'category', 'origin'],
                // example entries
                ['A1', 'Title 1', 'Text 1', 'Reason 1', 'Submitter A', 'Category A', 'Last Year Conference A'],
                ['B1', 'Title 2', 'Text 2', 'Reason 2', 'Submitter B', 'Category B', ''                      ],
                [''  , 'Title 3', 'Text 3', ''        , ''           , ''          , ''                      ],
            ];
            var csvString = csvRows.join("%0A");
            element.href = 'data:text/csv;charset=utf-8,' + csvString;
            element.download = 'motions-example.csv';
            element.target = '_blank';
        };
    }
])


.controller('CategoryListCtrl', [
    '$scope',
    'Category',
    function($scope, Category) {
        Category.bindAll({}, $scope, 'categories');

        // setup table sorting
        $scope.sortColumn = 'name';
        $scope.reverse = false;
        // function to sort by clicked column
        $scope.toggleSort = function ( column ) {
            if ( $scope.sortColumn === column ) {
                $scope.reverse = !$scope.reverse;
            }
            $scope.sortColumn = column;
        };

        // delete selected category
        $scope.delete = function (category) {
            Category.destroy(category.id);
        };
    }
])

.controller('CategoryDetailCtrl', [
    '$scope',
    'Category',
    'category',
    function($scope, Category, category) {
        Category.bindOne(category.id, $scope, 'category');
    }
])

.controller('CategoryCreateCtrl', [
    '$scope',
    '$state',
    'Category',
    function($scope, $state, Category) {
        $scope.category = {};
        $scope.save = function (category) {
            Category.create(category).then(
                function(success) {
                    $state.go('motions.category.list');
                }
            );
        };
    }
])

.controller('CategoryUpdateCtrl', [
    '$scope',
    '$state',
    'Category',
    'category',
    function($scope, $state, Category, category) {
        $scope.category = category;
        $scope.save = function (category) {
            Category.save(category).then(
                function(success) {
                    $state.go('motions.category.list');
                }
            );
        };
    }
])

.controller('CategorySortCtrl', [
    '$scope',
    '$stateParams',
    '$http',
    'MotionList',
    'Category',
    'category',
    'Motion',
    'motions',
    function($scope, $stateParams, $http, MotionList, Category, category, Motion, motions) {
        Category.bindOne(category.id, $scope, 'category');
        Motion.bindAll({}, $scope, 'motions');
        $scope.filter = { category_id: category.id,
                          orderBy: 'identifier' };

        $scope.$watch(
            function () {
                return Motion.lastModified();
            },
            function () {
                $scope.items = MotionList.getList(Motion.filter($scope.filter));
            }
        );

        $scope.alert = {};
        // Numbers all motions in this category by the given order in $scope.items
        $scope.numbering = function () {
            // Create a list of all motion ids in the current order.
            var sorted_motions = [];
            $scope.items.forEach(function (item) {
                sorted_motions.push(item.item.id);
            });

            // renumber them
            $http.post('/rest/motions/category/' + $scope.category.id + '/numbering/',
                {'motions': sorted_motions} )
            .success(function(data) {
                $scope.alert = { type: 'success', msg: data.detail, show: true };
            })
            .error(function(data) {
                $scope.alert = { type: 'danger', msg: data.detail, show: true };
            });
        };
    }
])

//mark all motions config strings for translation in javascript
.config([
    'gettext',
    function (gettext) {
        gettext('Motions');

        // subgroup General
        gettext('General');
        gettext('Workflow of new motions');
        gettext('Identifier');
        gettext('Numbered per category');
        gettext('Serially numbered');
        gettext('Set it manually');
        gettext('Motion preamble');
        gettext('The assembly may decide,');
        gettext('Default line numbering');
        /// Line numbering: Outside
        gettext('Outside');
        /// Line numbering: Inline
        gettext('Inline');
        /// Line numbering: None
        gettext('None');
        gettext('Line length');
        gettext('The maximum number of characters per line. Relevant when line numbering is enabled. Min: 40');
        gettext('Stop submitting new motions by non-staff users');
        gettext('Allow to disable versioning');
        gettext('Name of recommendation committee');
        gettext('Use an empty value to disable the recommendation system.');

        // subgroup Amendments
        gettext('Amendments');
        gettext('Activate amendments');
        gettext('Prefix for the identifier for amendments');
        gettext('Apply title and text for new amendments');

        // subgroup Suppoerters
        gettext('Supporters');
        gettext('Number of (minimum) required supporters for a motion');
        gettext('Choose 0 to disable the supporting system.');
        gettext('Remove all supporters of a motion if a submitter edits his ' +
                'motion in early state');

        // subgroup Supporters
        gettext('Comments');
        gettext('Comment fields for motions');
        gettext('Public');
        gettext('Private');

        // subgroup Voting and ballot papers
        gettext('Voting and ballot papers');
        gettext('The 100 % base of a voting result consists of');
        gettext('Yes/No/Abstain');
        gettext('Yes/No');
        gettext('All valid ballots');
        gettext('All casted ballots');
        gettext('Disabled (no percents)');
        gettext('Number of ballot papers (selection)');
        gettext('Number of all delegates');
        gettext('Number of all participants');
        gettext('Use the following custom number');
        gettext('Custom number of ballot papers');

        // subgroup PDF
        gettext('Title for PDF and DOCX documents (all motions)');
        gettext('Preamble text for PDF and DOCX documents (all motions)');
    }
]);

}());
