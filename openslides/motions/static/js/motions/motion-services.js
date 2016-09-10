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
            editor.on("init", function () {
                obj.lineBrokenText = motion.getTextWithLineBreaks($scope.version);
                obj.editor.setContent(obj.lineBrokenText);
                obj.originalHtml = obj.editor.getContent();
                obj.changed = false;
            });
            editor.on("change", function () {
                obj.changed = (editor.getContent() != obj.originalHtml);
            });
            editor.on("undo", function () {
                obj.changed = (editor.getContent() != obj.originalHtml);
            });
        };

        obj.setVersion = function (_motion, versionId) {
            motion = _motion; // If this is not updated,
            console.log(versionId, motion.getTextWithLineBreaks(versionId));
            obj.lineBrokenText = motion.getTextWithLineBreaks(versionId);
            obj.changed = false;
            obj.active = false;
            if (obj.editor) {
                obj.editor.setContent(obj.lineBrokenText);
                obj.editor.setMode("readonly");
                obj.originalHtml = obj.editor.getContent();
            } else {
                obj.originalHtml = obj.lineBrokenText;
            }
        };

        obj.enable = function () {
            obj.editor.setMode("design");
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
            obj.editor.setMode("readonly");
            obj.active = false;
            obj.changed = false;
            obj.lineBrokenText = obj.originalHtml;
            obj.editor.setContent(obj.originalHtml);
        };

        obj.save = function () {
            if (!motion.isAllowed('update')) {
                throw "No permission to update motion";
            }

            motion.setTextStrippingLineBreaks(motion.active_version, obj.editor.getContent());
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
        var obj = {
            mode: 0, // 0: not editing; 1: selecting lines; 2: editing the text
            lineFrom: 1,
            lineTo: 2,
            html: '',
            reviewingHtml: '',
        };
        var motion = null;

        obj.startCreating = function () {
            obj.mode = 1;
            $(".motion-text .os-line-number").each(function () {
                $(this).addClass("selectable");
            });
        };
        obj.setFromLine = function (line) {
            obj.mode = 2;
            obj.lineFrom = line;

            $(".motion-text .os-line-number").each(function () {
                var $this = $(this);
                if ($this.data("line-number") > line) {
                    $(this).addClass("selectable");
                } else {
                    $(this).removeClass("selectable");
                }
            });
        };
        obj.setToLine = function (line) {
            if (line <= obj.lineFrom) {
                return;
            }
            obj.mode = 3;
            obj.lineTo = line;
            ngDialog.open(ChangeRecommendationForm.getCreateDialog(
                motion,
                obj.lineFrom,
                obj.lineTo
            ));

            obj.lineFrom = 0;
            obj.lineTo = 0;
            $(".motion-text .os-line-number").removeClass("selected selectable");
        };
        obj.lineClicked = function (ev) {
            if (obj.mode == 0) {
                return;
            }
            if (obj.mode == 1) {
                obj.setFromLine($(ev.target).data("line-number"));
                $(ev.target).addClass("selected").removeClass("selectable");
            } else if (obj.mode == 2) {
                obj.setToLine($(ev.target).data("line-number"));
            }
        };
        obj.mouseOver = function (ev) {
            if (obj.mode != 2) {
                return;
            }
            var hoverLine = $(ev.target).data("line-number");
            $(".motion-text .os-line-number").each(function () {
                var line = $(this).data("line-number");
                if (line >= obj.lineFrom && line <= hoverLine) {
                    $(this).addClass("selected");
                } else {
                    $(this).removeClass("selected");
                }
            });
        };
        obj.init = function (_motion) {
            motion = _motion;
            var $content = $("#content");
            $content.on("click", ".os-line-number.selectable", obj.lineClicked);
            $content.on("mouseover", ".os-line-number.selectable", obj.mouseOver);
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
    function () {
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

        var obj = {
            mode: 'original'
        };
        obj.diffFormatterCb = function (oldFragment, newFragment) {
            for (var i = 0; i < oldFragment.childNodes.length; i++) {
                addCSSClass(oldFragment.childNodes[i], 'delete');
            }
            for (i = 0; i < newFragment.childNodes.length; i++) {
                addCSSClass(newFragment.childNodes[i], 'insert');
            }
            var mergedFragment = document.createDocumentFragment(),
                el;

            while (oldFragment.firstChild) {
                el = oldFragment.firstChild;
                oldFragment.removeChild(el);
                mergedFragment.appendChild(el);
            }
            while (newFragment.firstChild) {
                el = newFragment.firstChild;
                newFragment.removeChild(el);
                mergedFragment.appendChild(el);
            }

            return mergedFragment;
        };

        return obj;
    }
])

}());
