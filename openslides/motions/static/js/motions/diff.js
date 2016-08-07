(function () {

"use strict";

angular.module('OpenSlidesApp.motions.diff', ['OpenSlidesApp.motions.lineNumbering'])

/**
 * Current limitations of this implementation:
 *
 */

.service('diffService', function (lineNumberingService) {
    var ELEMENT_NODE = 1,
        TEXT_NODE = 3,
        DOCUMENT_FRAGMENT_NODE = 11;


    this.getLineNumberNode = function(fragment, lineNumber) {
        return fragment.querySelector('span.os-line-number.line-number-' + lineNumber);
    };

    this._getNodeContextTrace = function(node) {
        var context = [],
            currNode = node;
        while (currNode) {
            context.unshift(currNode);
            currNode = currNode.parentNode;
        }
        return context;
    };

  /*
   * Returns an array with the following values:
   * 0: the most specific DOM-node that contains both line numbers
   * 1: the context of node1 (an array of dom-elements; 0 is the document fragment)
   * 2: the context of node2 (an array of dom-elements; 0 is the document fragment)
   * 3: the index of [0] in the two arrays
   */
    this._getCommonAncestor = function(node1, node2) {
        var trace1 = this._getNodeContextTrace(node1),
            trace2 = this._getNodeContextTrace(node2),
            commonAncestor = null,
            commonIndex = null,
            childTrace1 = [],
            childTrace2 = [];

        for (var i = 0; i < trace1.length && i < trace2.length; i++) {
            if (trace1[i] == trace2[i]) {
                commonAncestor = trace1[i];
                commonIndex = i;
            }
        }
        for (i = commonIndex + 1; i < trace1.length; i++) {
            childTrace1.push(trace1[i]);
        }
        for (i = commonIndex + 1; i < trace2.length; i++) {
            childTrace2.push(trace2[i]);
        }
        return {
            'commonAncestor': commonAncestor,
            'trace1' : childTrace1,
            'trace2' : childTrace2,
            'index': commonIndex
        };
    };

    this._serializeTag = function(node) {
        var html = '<' + node.nodeName;
        for (var i = 0; i < node.attributes.length; i++) {
          var attr = node.attributes[i];
          html += " " + attr.name + "=\"" + attr.value + "\"";
        }
        html += '>';
        return html;
    };

    this._serializeDom = function(node) {
        if (node.nodeType == TEXT_NODE) {
            return node.nodeValue;
        }
        if (lineNumberingService._isOsLineNumberNode(node) || lineNumberingService._isOsLineBreakNode(node)) {
            return ''
        }
        if (node.nodeName == 'BR') {
            return '<BR>';
        } else {
            var html = this._serializeTag(node);
            for (var i = 0; i < node.childNodes.length; i++) {
                if (node.childNodes[i].nodeType == TEXT_NODE) {
                    html += node.childNodes[i].nodeValue;
                } else if (
                  !lineNumberingService._isOsLineNumberNode(node.childNodes[i]) &&
                  !lineNumberingService._isOsLineBreakNode(node.childNodes[i])
                ) {
                    html += this._serializeDom(node.childNodes[i]);
                }
            }
            html += '</' + node.nodeName + '>';

            return html;
        }
    };

    this._serializePartialDomToChild = function(node, toChildTrace) {
        if (lineNumberingService._isOsLineNumberNode(node) || lineNumberingService._isOsLineBreakNode(node)) {
            return ''
        }

        var html = this._serializeTag(node);

        for (var i = 0, found = false; i < node.childNodes.length && !found; i++) {
            if (node.childNodes[i] == toChildTrace[0]) {
                found = true;
                var remainingTrace = toChildTrace;
                remainingTrace.shift();
                if (!lineNumberingService._isOsLineNumberNode(node.childNodes[i])) {
                    html += this._serializePartialDomToChild(node.childNodes[i], remainingTrace);
                }
            } else if (node.childNodes[i].nodeType == TEXT_NODE) {
                html += node.childNodes[i].nodeValue;
            } else {
                if (
                  !lineNumberingService._isOsLineNumberNode(node.childNodes[i]) &&
                  !lineNumberingService._isOsLineBreakNode(node.childNodes[i])
                ) {
                    html += this._serializeDom(node.childNodes[i]);
                }
            }
        }
        return html;
    };

    this._serializePartialDomFromChild = function(node, fromChildTrace) {
        if (lineNumberingService._isOsLineNumberNode(node) || lineNumberingService._isOsLineBreakNode(node)) {
            return ''
        }
        var html = '';
        for (var i = 0, found = false; i < node.childNodes.length; i++) {
            if (node.childNodes[i] == fromChildTrace[0]) {
                found = true;
                var remainingTrace = fromChildTrace;
                remainingTrace.shift();
                if (!lineNumberingService._isOsLineNumberNode(node.childNodes[i])) {
                    html += this._serializePartialDomFromChild(node.childNodes[i], remainingTrace);
                }
            } else if (found) {
                if (node.childNodes[i].nodeType == TEXT_NODE) {
                    html += node.childNodes[i].nodeValue;
                } else {
                    if (
                      !lineNumberingService._isOsLineNumberNode(node.childNodes[i]) &&
                      !lineNumberingService._isOsLineBreakNode(node.childNodes[i])
                    ) {
                        html += this._serializeDom(node.childNodes[i]);
                    }
                }
            }
        }
        html += '</' + node.nodeName + '>';
        return html;
    };

    /**
     * Returns the HTML snippet between two given line numbers.
     *
     * In addition to the HTML snippet, additional information is provided regarding the most specific DOM element
     * that contains the whole section specified by the line numbers (like a P-element if only one paragraph is selected
     * or the most outer DIV, if multiple sections selected).
     *
     * This additional information is meant to render the snippet correctly without producing broken HTML
     *
     * The return object has the following fields:
     * - html: The HTML between the two line numbers.
     *         Line numbers and automatically set line breaks are stripped.
     *         All HTML tags are converted to uppercase
     *         (e.g. Line 2</LI><LI>Line3</LI><LI>Line 4 <br>)
     * - ancestor: the most specific DOM element that contains the HTML snippet (e.g. a UL, if several LIs are selected)
     * - outerContextStart: An HTML string that opens all necessary tags to get the browser into the rendering mode
     *                      of the ancestor element (e.g. <DIV><UL> in the case of the multiple LIs)
     * - outerContectEnd:   An HTML string that closes all necessary tags from the ancestor element (e.g. </UL></DIV>
     * - innerContextStart: A string that opens all necessary tags between the ancestor
     *                      and the beginning of the selection (e.g. <LI>)
     * - innerContextEnd:   A string that closes all tags after the end of the selection to the ancestor (e.g. </LI>)
     */
    this.extractRangeByLineNumbers = function(fragment, fromLine, toLine, debug) {
        var fromLineNode = this.getLineNumberNode(fragment, fromLine),
            toLineNode = this.getLineNumberNode(fragment, toLine),
            ancestorData = this._getCommonAncestor(fromLineNode, toLineNode);

        var fromChildTrace = ancestorData.trace1,
            toChildTrace = ancestorData.trace2,
            ancestor = ancestorData.commonAncestor,
            html = '',
            outerContextStart = '',
            outerContextEnd = '',
            innerContextStart = '',
            innerContextEnd = '';

        var found = false;
        for (var i = 0; i < fromChildTrace.length && !found; i++) {
            if (lineNumberingService._isOsLineNumberNode(fromChildTrace[i])) {
                found = true;
            } else {
                innerContextStart += this._serializeTag(fromChildTrace[i]);
            }
        }
        found = false;
        for (i = 0; i < toChildTrace.length && !found; i++) {
            if (lineNumberingService._isOsLineNumberNode(toChildTrace[i])) {
                found = true;
            } else {
                innerContextEnd = '</' + toChildTrace[i].nodeName + '>' + innerContextEnd;
            }
        }

        for (i = 0; i < ancestor.childNodes.length; i++) {
            if (ancestor.childNodes[i] == fromChildTrace[0]) {
                found = true;
                fromChildTrace.shift();
                html += this._serializePartialDomFromChild(ancestor.childNodes[i], fromChildTrace);
            } else if (ancestor.childNodes[i] == toChildTrace[0]) {
                found = false;
                toChildTrace.shift();
                html += this._serializePartialDomToChild(ancestor.childNodes[i], toChildTrace);
            } else if (found == true) {
                html += this._serializeDom(ancestor.childNodes[i]);
            }
        }
        
        var currNode = ancestor;

        while (currNode.parentNode && currNode.parentNode.nodeType != DOCUMENT_FRAGMENT_NODE) {
            outerContextStart = this._serializeTag(currNode) + outerContextStart;
            outerContextEnd += '</' + currNode.nodeName + '>';
            currNode = currNode.parentNode;
        }

        return {
            'html': html,
            'ancestor': ancestor,
            'outerContextStart': outerContextStart,
            'outerContextEnd': outerContextEnd,
            'innerContextStart': innerContextStart,
            'innerContextEnd': innerContextEnd
        };
    };
});


}());
