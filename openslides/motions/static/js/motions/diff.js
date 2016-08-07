(function () {

"use strict";

angular.module('OpenSlidesApp.motions.diff', [])

/**
 * Current limitations of this implementation:
 *
 */

.service('lineNumberingService', function () {

    this.getLineNumberNode = function(fragment, lineNumber) {
        return fragment.querySelector('span.os-line-number.line-number-' + lineNumber);
    };
});


}());
