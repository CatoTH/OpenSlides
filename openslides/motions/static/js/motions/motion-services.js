(function () {

"use strict";

angular.module('OpenSlidesApp.motions.motionservices', ['OpenSlidesApp.motions', 'OpenSlidesApp.motions.lineNumbering'])

.factory('MotionInlineEditing', [
    'Editor',
    'Motion',
    'Config',
    '$timeout',
    function (Editor, Motion, Config, $timeout) {
        var obj = {
            active: false,
            changed: false,
            trivialChange: false,
            editor: null,
            lineBrokenText: null,
            originalHtml: null
        };

        var $scope, motion;

        obj.init = function (_scope, _motion) {
            $scope = _scope;
            motion = _motion;
            obj.lineBrokenText = motion.getTextWithLineBreaks($scope.version);
            obj.originalHtml = obj.lineBrokenText;

            if (motion.state.versioning && Config.get('motions_allow_disable_versioning').value) {
                obj.trivialChange = true;
            }
        };


        obj.tinymceOptions = Editor.getOptions(null, true);
        obj.tinymceOptions.readonly = 1;
        obj.tinymceOptions.setup = function (editor) {
            obj.editor = editor;
            editor.on('init', function () {
                obj.lineBrokenText = motion.getTextWithLineBreaks($scope.version);
                obj.editor.setContent(obj.lineBrokenText);
                obj.originalHtml = obj.editor.getContent();
                obj.changed = false;
            });
            editor.on('change', function () {
                obj.changed = (editor.getContent() != obj.originalHtml);
            });
            editor.on('undo', function () {
                obj.changed = (editor.getContent() != obj.originalHtml);
            });
        };

        obj.setVersion = function (_motion, versionId) {
            motion = _motion; // If this is not updated,
            obj.lineBrokenText = motion.getTextWithLineBreaks(versionId);
            obj.changed = false;
            obj.active = false;
            if (obj.editor) {
                obj.editor.setContent(obj.lineBrokenText);
                obj.editor.setMode('readonly');
                obj.originalHtml = obj.editor.getContent();
            } else {
                obj.originalHtml = obj.lineBrokenText;
            }
        };

        obj.enable = function () {
            obj.editor.setMode('design');
            obj.active = true;
            obj.changed = false;

            obj.lineBrokenText = motion.getTextWithLineBreaks($scope.version);
            obj.editor.setContent(obj.lineBrokenText);
            obj.originalHtml = obj.editor.getContent();
            $timeout(function () {
                obj.editor.focus();
            }, 100);
        };

        obj.disable = function () {
            obj.editor.setMode('readonly');
            obj.active = false;
            obj.changed = false;
            obj.lineBrokenText = obj.originalHtml;
            obj.editor.setContent(obj.originalHtml);
        };

        obj.save = function () {
            if (!motion.isAllowed('update')) {
                throw 'No permission to update motion';
            }

            motion.setTextStrippingLineBreaks(obj.editor.getContent());
            motion.disable_versioning = (obj.trivialChange && Config.get('motions_allow_disable_versioning').value);

            Motion.inject(motion);
            // save change motion object on server
            Motion.save(motion, {method: 'PATCH'}).then(
                function (success) {
                    $scope.showVersion(motion.getVersion(-1));
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

        return obj;
    }
])

.factory('ChangeRecommmendationCreate', [
    'ngDialog',
    'ChangeRecommendationForm',
    function(ngDialog, ChangeRecommendationForm) {
        var MODE_INACTIVE = 0,
            MODE_SELECTING_FROM = 1,
            MODE_SELECTING_TO = 2,
            MODE_EDITING = 3;

        var obj = {
            mode: MODE_INACTIVE,
            lineFrom: 1,
            lineTo: 2,
            html: '',
            reviewingHtml: ''
        };

        var motion = null,
            version = null;

        obj._getAffectedLineNumbers = function () {
            var changeRecommendations = motion.getChangeRecommendations(version),
                affectedLines = [];
            for (var i = 0; i < changeRecommendations.length; i++) {
                var change = changeRecommendations[i];
                for (var j = change.line_from; j < change.line_to; j++) {
                    affectedLines.push(j);
                }
            }
            return affectedLines;
        };

        obj.startCreating = function () {
            obj.mode = MODE_SELECTING_FROM;
            var alreadyAffectedLines = obj._getAffectedLineNumbers();
            $(".motion-text-original .os-line-number").each(function () {
                var $this = $(this),
                    lineNumber = $this.data("line-number");
                if (alreadyAffectedLines.indexOf(lineNumber) == -1) {
                    $(this).addClass("selectable");
                }
            });
        };

        obj.setFromLine = function (line) {
            obj.mode = MODE_SELECTING_TO;
            obj.lineFrom = line;

            var alreadyAffectedLines = obj._getAffectedLineNumbers(),
                foundCollission = false;

            $(".motion-text-original .os-line-number").each(function () {
                var $this = $(this);
                if ($this.data("line-number") >= line && !foundCollission) {
                    if (alreadyAffectedLines.indexOf($this.data("line-number")) == -1) {
                        $(this).addClass("selectable");
                    } else {
                        $(this).removeClass("selectable");
                        foundCollission = true;
                    }
                } else {
                    $(this).removeClass("selectable");
                }
            });
        };

        obj.setToLine = function (line) {
            if (line < obj.lineFrom) {
                return;
            }
            obj.mode = MODE_EDITING;
            obj.lineTo = line + 1;
            ngDialog.open(ChangeRecommendationForm.getCreateDialog(
                motion,
                version,
                obj.lineFrom,
                obj.lineTo
            ));

            obj.lineFrom = 0;
            obj.lineTo = 0;
            $(".motion-text-original .os-line-number").removeClass("selected selectable");
        };

        obj.lineClicked = function (ev) {
            if (obj.mode == 0) {
                return;
            }
            if (obj.mode == MODE_SELECTING_FROM) {
                obj.setFromLine($(ev.target).data("line-number"));
                $(ev.target).addClass("selected");
            } else if (obj.mode == MODE_SELECTING_TO) {
                obj.setToLine($(ev.target).data("line-number"));
            }
        };

        obj.mouseOver = function (ev) {
            if (obj.mode != MODE_SELECTING_TO) {
                return;
            }
            var hoverLine = $(ev.target).data("line-number");
            $(".motion-text-original .os-line-number").each(function () {
                var line = $(this).data("line-number");
                if (line >= obj.lineFrom && line <= hoverLine) {
                    $(this).addClass("selected");
                } else {
                    $(this).removeClass("selected");
                }
            });
        };

        obj.setVersion = function (_motion, _version) {
            motion = _motion;
            version = _version;
        };

        obj.init = function (_motion, $scope) {
            motion = _motion;
            version = $scope.version;
            var $content = $("#content");
            $content.on("click", ".os-line-number.selectable", obj.lineClicked);
            $content.on("mouseover", ".os-line-number.selectable", obj.mouseOver);

            $scope.$on("$destroy", function () {
                obj.destroy();
            });
        };

        obj.destroy = function () {
            var $content = $("#content");
            $content.off("click", ".os-line-number.selectable", obj.lineClicked);
            $content.off("mouseover", ".os-line-number.selectable", obj.mouseOver);
        };

        return obj;
    }
])

.factory('ChangeRecommmendationView', [
    'Motion',
    'MotionChangeRecommendation',
    'Config',
    'lineNumberingService',
    'diffService',
    '$interval',
    function (Motion, MotionChangeRecommendation, Config, lineNumberingService, diffService, $interval) {
        var ELEMENT_NODE = 1,

            addCSSClass = function (node, className) {
                if (node.nodeType != ELEMENT_NODE) {
                    return;
                }
                var classes = node.getAttribute('class');
                classes = (classes ? classes.split(' ') : []);
                if (classes.indexOf(className) == -1) {
                    classes.push(className);
                }
                node.setAttribute('class', classes);
            };

        var $scope;

        var obj = {
            mode: 'original'
        };

        obj.diffFormatterCb = function (change, oldFragment, newFragment) {
            for (var i = 0; i < oldFragment.childNodes.length; i++) {
                addCSSClass(oldFragment.childNodes[i], 'delete');
            }
            for (i = 0; i < newFragment.childNodes.length; i++) {
                addCSSClass(newFragment.childNodes[i], 'insert');
            }
            var mergedFragment = document.createDocumentFragment(),
                diffSection = document.createElement('SECTION'),
                el;

            mergedFragment.appendChild(diffSection);
            diffSection.setAttribute('class', 'diff');
            diffSection.setAttribute('data-change-id', change.id);

            while (oldFragment.firstChild) {
                el = oldFragment.firstChild;
                oldFragment.removeChild(el);
                diffSection.appendChild(el);
            }
            while (newFragment.firstChild) {
                el = newFragment.firstChild;
                newFragment.removeChild(el);
                diffSection.appendChild(el);
            }

            return mergedFragment;
        };

        obj.formatChangeRecommendation = function (motion, version, change) {
            var lineLength = Config.get('motions_line_length').value,
                html = lineNumberingService.insertLineNumbers(motion.getVersion(version).text, lineLength);
            
            var data = diffService.extractRangeByLineNumbers(html, change.line_from, change.line_to),
                oldText = data.outerContextStart + data.innerContextStart +
                    data.html + data.innerContextEnd + data.outerContextEnd,
                oldTextWithBreaks = lineNumberingService.insertLineNumbersNode(oldText, lineLength, change.line_from),
                newTextWithBreaks = lineNumberingService.insertLineNumbersNode(change.text, lineLength, change.line_from);

            for (var i = 0; i < oldTextWithBreaks.childNodes.length; i++) {
                addCSSClass(oldTextWithBreaks.childNodes[i], 'delete');
            }
            for (i = 0; i < newTextWithBreaks.childNodes.length; i++) {
                addCSSClass(newTextWithBreaks.childNodes[i], 'insert');
            }

            var mergedFragment = document.createDocumentFragment();
            while (oldTextWithBreaks.firstChild) {
                var el = oldTextWithBreaks.firstChild;
                oldTextWithBreaks.removeChild(el);
                mergedFragment.appendChild(el);
            }
            while (newTextWithBreaks.firstChild) {
                el = newTextWithBreaks.firstChild;
                newTextWithBreaks.removeChild(el);
                mergedFragment.appendChild(el);
            }

            return diffService._serializeDom(mergedFragment);
        };

        obj.delete = function (changeId) {
            MotionChangeRecommendation.destroy(changeId);
        };

        obj.repositionOriginalAnnotations = function () {
            var $changeRecommendationList = $('.change-recommendation-list'),
                $lineNumberReference = $('.motion-text-original');

            $changeRecommendationList.children().each(function() {
                var $this = $(this),
                    lineFrom = $this.data('line-from'),
                    lineTo = ($this.data('line-to') - 1),
                    $lineFrom = $lineNumberReference.find('.line-number-' + lineFrom),
                    $lineTo = $lineNumberReference.find('.line-number-' + lineTo),
                    fromTop = $lineFrom.position().top + 3,
                    toTop = $lineTo.position().top + 20,
                    height = (toTop - fromTop);

                if (height < 10) {
                    height = 10;
                }
                $this.css({ 'top': fromTop, 'height': height });
            });
        };

        obj.newVersionIncludingChanges = function (motion, version) {
            if (!motion.isAllowed('update')) {
                throw 'No permission to update motion';
            }

            var newHtml = motion.getTextWithAcceptedChangeRecommendations(version);

            motion.setTextStrippingLineBreaks(newHtml);

            Motion.inject(motion);
            // save change motion object on server
            Motion.save(motion, {method: 'PATCH'}).then(
                function (success) {
                    $scope.showVersion(motion.getVersion(-1));
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

        obj.init = function (_scope) {
            $scope = _scope;
            $scope.$evalAsync(function() {
                obj.repositionOriginalAnnotations();
            });
            $scope.$watch(function() {
                return $('.change-recommendation-list').children().length;
            }, obj.repositionOriginalAnnotations);

            var sizeCheckerLastSize = null,
                sizeCheckerLastClass = null,
                sizeChecker = $interval(function() {
                    var $holder = $(".motion-text-original"),
                        newHeight = $holder.height(),
                        classes = $holder.attr("class");
                    if (newHeight != sizeCheckerLastSize || sizeCheckerLastClass != classes) {
                        sizeCheckerLastSize = newHeight;
                        sizeCheckerLastClass = classes;
                        obj.repositionOriginalAnnotations();
                    }
                }, 100);

            $scope.$on('$destroy', function() {
                sizeChecker.cancel();
            });
        };

        return obj;
    }
])

}());
