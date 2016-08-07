(function () {

"use strict";

angular.module('OpenSlidesApp.motions.diff', ['OpenSlidesApp.motions.lineNumbering'])

/**
 * Current limitations of this implementation:
 *
 */

.service('diffService', function (lineNumberingService) {
    var ELEMENT_NODE = 1,
        TEXT_NODE = 3;


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
        var html = '<' + node.nodeName + '>';
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

    this.extractRangeByLineNumbers = function(fragment, fromLine, toLine) {
        var fromLineNode = this.getLineNumberNode(fragment, fromLine),
            toLineNode = this.getLineNumberNode(fragment, toLine),
            ancestors = this._getCommonAncestor(fromLineNode, toLineNode);

        return ;
    };
});


}());
