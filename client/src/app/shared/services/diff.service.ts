import { Injectable } from '@angular/core';
import { LinenumberingService } from './linenumbering.service';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;
const DOCUMENT_FRAGMENT_NODE = 11;

export enum ModificationType {
    TYPE_REPLACEMENT,
    TYPE_INSERTION,
    TYPE_DELETION,
    TYPE_OTHER
}

interface CommonAncestorData {
    commonAncestor: Node;
    trace1: Node[];
    trace2: Node[];
    index: number;
}

interface ExtractedContent {
    html: string;
    ancestor: Node;
    outerContextStart: string;
    outerContextEnd: string;
    innerContextStart: string;
    innerContextEnd: string;
    previousHtml: string;
    previousHtmlEndSnippet: string;
    followingHtml: string;
    followingHtmlStartSnippet: string;
}

interface LineRange {
    from: number;
    to: number;
}

/**
 * Authenticates an OpenSlides user with username and password
 */
@Injectable({
    providedIn: 'root'
})
export class DiffService {
    public static getLineNumberNode(fragment: DocumentFragment, lineNumber: number): Element {
        return fragment.querySelector('os-linebreak.os-line-number.line-number-' + lineNumber);
    }

    /**
     * @param {Node} node
     */
    private static getFirstLineNumberNode(node: Node): Element {
        if (node.nodeType === TEXT_NODE) {
            return null;
        }
        const element = <Element>node;
        if (element.nodeName === 'OS-LINEBREAK') {
            return element;
        }
        const found = element.querySelectorAll('OS-LINEBREAK');
        if (found.length > 0) {
            return found.item(0);
        } else {
            return null;
        }
    }

    /**
     * @param {Node} node
     */
    private static getLastLineNumberNode(node: Node): Element {
        if (node.nodeType === TEXT_NODE) {
            return null;
        }
        const element = <Element>node;
        if (element.nodeName === 'OS-LINEBREAK') {
            return element;
        }
        const found = element.querySelectorAll('OS-LINEBREAK');
        if (found.length > 0) {
            return found.item(found.length - 1);
        } else {
            return null;
        }
    }

    private static getNodeContextTrace(node: Node): Node[] {
        const context = [];
        let currNode = node;
        while (currNode) {
            context.unshift(currNode);
            currNode = currNode.parentNode;
        }
        return context;
    }

    private static isFirstNonemptyChild(node: Node, child: Node): boolean {
        for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i] === child) {
                return true;
            }
            if (node.childNodes[i].nodeType !== TEXT_NODE || node.childNodes[i].nodeValue.match(/\S/)) {
                return false;
            }
        }
        return false;
    }

    // Adds elements like <OS-LINEBREAK class="os-line-number line-number-23" data-line-number="23"/>
    public static insertInternalLineMarkers(fragment: DocumentFragment): void {
        if (fragment.querySelectorAll('OS-LINEBREAK').length > 0) {
            // Prevent duplicate calls
            return;
        }
        const lineNumbers = fragment.querySelectorAll('span.os-line-number');
        let lineMarker, maxLineNumber;

        for (let i = 0; i < lineNumbers.length; i++) {
            let insertBefore: Node = lineNumbers[i];
            while (
                insertBefore.parentNode.nodeType !== DOCUMENT_FRAGMENT_NODE &&
                DiffService.isFirstNonemptyChild(insertBefore.parentNode, insertBefore)
            ) {
                insertBefore = insertBefore.parentNode;
            }
            lineMarker = document.createElement('OS-LINEBREAK');
            lineMarker.setAttribute('data-line-number', lineNumbers[i].getAttribute('data-line-number'));
            lineMarker.setAttribute('class', lineNumbers[i].getAttribute('class'));
            insertBefore.parentNode.insertBefore(lineMarker, insertBefore);
            maxLineNumber = lineNumbers[i].getAttribute('data-line-number');
        }

        // Add one more "fake" line number at the end and beginning, so we can select the last line as well
        lineMarker = document.createElement('OS-LINEBREAK');
        lineMarker.setAttribute('data-line-number', parseInt(maxLineNumber, 10) + 1);
        lineMarker.setAttribute('class', 'os-line-number line-number-' + (parseInt(maxLineNumber, 10) + 1));
        fragment.appendChild(lineMarker);

        lineMarker = document.createElement('OS-LINEBREAK');
        lineMarker.setAttribute('data-line-number', '0');
        lineMarker.setAttribute('class', 'os-line-number line-number-0');
        fragment.insertBefore(lineMarker, fragment.firstChild);
    }

    // @TODO Check if this is actually necessary
    private static insertInternalLiNumbers(fragment: DocumentFragment): void {
        if (fragment.querySelectorAll('LI[os-li-number]').length > 0) {
            // Prevent duplicate calls
            return;
        }
        const ols = fragment.querySelectorAll('OL');
        for (let i = 0; i < ols.length; i++) {
            const ol: Element = ols[i];
            let liNo = 0;
            for (let j = 0; j < ol.childNodes.length; j++) {
                if (ol.childNodes[j].nodeName === 'LI') {
                    const li = <Element>ol.childNodes[j];
                    liNo++;
                    li.setAttribute('os-li-number', liNo.toString());
                }
            }
        }
    }

    /*
    private static addStartToOlIfNecessary(element: Element) {
        let firstLiNo = null;
        for (let i = 0; i < element.childNodes.length && firstLiNo === null; i++) {
            if (element.childNodes[i].nodeName === 'LI') {
                // childnode? @TODO
                const li = <Element>element.childNodes[i];
                let lineNo = li.getAttribute('ol-li-number');
                if (lineNo) {
                    firstLiNo = parseInt(lineNo, 10);
                }
            }
        }
        if (firstLiNo > 1) {
            element.setAttribute('start', firstLiNo);
        }
    }
    */

    private static isWithinNthLIOfOL(olNode: Element, descendantNode: Node): number {
        let nthLIOfOL = null;
        while (descendantNode.parentNode) {
            if (descendantNode.parentNode === olNode) {
                let lisBeforeOl = 0,
                    foundMe = false;
                for (let i = 0; i < olNode.childNodes.length && !foundMe; i++) {
                    if (olNode.childNodes[i] === descendantNode) {
                        foundMe = true;
                    } else if (olNode.childNodes[i].nodeName === 'LI') {
                        lisBeforeOl++;
                    }
                }
                nthLIOfOL = lisBeforeOl + 1;
            }
            descendantNode = descendantNode.parentNode;
        }
        return nthLIOfOL;
    }

    /*
     * Returns an array with the following values:
     * 0: the most specific DOM-node that contains both line numbers
     * 1: the context of node1 (an array of dom-elements; 0 is the document fragment)
     * 2: the context of node2 (an array of dom-elements; 0 is the document fragment)
     * 3: the index of [0] in the two arrays
     */
    public static getCommonAncestor(node1: Node, node2: Node): CommonAncestorData {
        const trace1 = DiffService.getNodeContextTrace(node1),
            trace2 = DiffService.getNodeContextTrace(node2),
            childTrace1 = [],
            childTrace2 = [];
        let commonAncestor = null,
            commonIndex = null;

        for (let i = 0; i < trace1.length && i < trace2.length; i++) {
            if (trace1[i] === trace2[i]) {
                commonAncestor = trace1[i];
                commonIndex = i;
            }
        }
        for (let i = commonIndex + 1; i < trace1.length; i++) {
            childTrace1.push(trace1[i]);
        }
        for (let i = commonIndex + 1; i < trace2.length; i++) {
            childTrace2.push(trace2[i]);
        }
        return {
            commonAncestor: commonAncestor,
            trace1: childTrace1,
            trace2: childTrace2,
            index: commonIndex
        };
    }

    private static serializeTag(node: Node): string {
        if (node.nodeType === DOCUMENT_FRAGMENT_NODE) {
            // Fragments are only placeholders and do not have an HTML representation
            return '';
        }
        let html = '<' + node.nodeName;
        for (let i = 0; i < node.attributes.length; i++) {
            const attr = node.attributes[i];
            if (attr.name !== 'os-li-number') {
                html += ' ' + attr.name + '="' + attr.value + '"';
            }
        }
        html += '>';
        return html;
    }

    /**
     * @param {string} html
     * @return {DocumentFragment}
     */
    public static htmlToFragment(html: string): DocumentFragment {
        const fragment = document.createDocumentFragment(),
            div = document.createElement('DIV');
        div.innerHTML = html;
        while (div.childElementCount) {
            const child = div.childNodes[0];
            div.removeChild(child);
            fragment.appendChild(child);
        }
        return fragment;
    }

    /**
     *
     * @param {string} html
     * @returns {string}
     * @private
     */
    public static normalizeHtmlForDiff(html: string): string {
        // Convert all HTML tags to uppercase, but leave the values of attributes unchanged
        // All attributes and CSS class names  are sorted alphabetically
        // If an attribute is empty, it is removed
        html = html.replace(/<(\/?[a-z]*)( [^>]*)?>/gi, function(_fullHtml, tag, attributes) {
            const tagNormalized = tag.toUpperCase();
            if (attributes === undefined) {
                attributes = '';
            }
            const attributesList = [],
                attributesMatcher = /( [^"'=]*)(= *((["'])(.*?)\4))?/gi;
            let match;
            do {
                match = attributesMatcher.exec(attributes);
                if (match) {
                    let attrNormalized = match[1].toUpperCase(),
                        attrValue = match[5];
                    if (match[2] !== undefined) {
                        if (attrNormalized === ' CLASS') {
                            attrValue = attrValue
                                .split(' ')
                                .sort()
                                .join(' ')
                                .replace(/^\s+/, '')
                                .replace(/\s+$/, '');
                        }
                        attrNormalized += '=' + match[4] + attrValue + match[4];
                    }
                    if (attrValue !== '') {
                        attributesList.push(attrNormalized);
                    }
                }
            } while (match);
            attributes = attributesList.sort().join('');
            return '<' + tagNormalized + attributes + '>';
        });

        const entities = {
            '&nbsp;': ' ',
            '&ndash;': '-',
            '&auml;': 'ä',
            '&ouml;': 'ö',
            '&uuml;': 'ü',
            '&Auml;': 'Ä',
            '&Ouml;': 'Ö',
            '&Uuml;': 'Ü',
            '&szlig;': 'ß',
            '&bdquo;': '„',
            '&ldquo;': '“',
            '&bull;': '•',
            '&sect;': '§',
            '&eacute;': 'é',
            '&euro;': '€'
        };

        html = html
            .replace(/\s+<\/P>/gi, '</P>')
            .replace(/\s+<\/DIV>/gi, '</DIV>')
            .replace(/\s+<\/LI>/gi, '</LI>');
        html = html.replace(/\s+<LI>/gi, '<LI>').replace(/<\/LI>\s+/gi, '</LI>');
        html = html.replace(/\u00A0/g, ' ');
        html = html.replace(/\u2013/g, '-');
        Object.keys(entities).forEach(ent => {
            html = html.replace(new RegExp(ent, 'g'), entities[ent]);
        });

        // Newline characters: after closing block-level-elements, but not after BR (which is inline)
        html = html.replace(/(<br *\/?>)\n/gi, '$1');
        html = html.replace(/[ \n\t]+/gi, ' ');
        html = html.replace(/(<\/(div|p|ul|li|blockquote>)>) /gi, '$1\n');

        return html;
    }

    private static getAllNextSiblings(element: Node): Node[] {
        const elements = [];
        while (element.nextSibling) {
            elements.push(element.nextSibling);
            element = element.nextSibling;
        }
        return elements;
    }

    private static getAllPrevSiblingsReversed(element: Node): Node[] {
        const elements = [];
        while (element.previousSibling) {
            elements.push(element.previousSibling);
            element = element.previousSibling;
        }
        return elements;
    }

    /**
     * @param {string} htmlOld
     * @param {string} htmlNew
     * @returns {number}
     */
    public static detectReplacementType(htmlOld: string, htmlNew: string): ModificationType {
        htmlOld = DiffService.normalizeHtmlForDiff(htmlOld);
        htmlNew = DiffService.normalizeHtmlForDiff(htmlNew);

        if (htmlOld === htmlNew) {
            return ModificationType.TYPE_REPLACEMENT;
        }

        let i, foundDiff;
        for (i = 0, foundDiff = false; i < htmlOld.length && i < htmlNew.length && foundDiff === false; i++) {
            if (htmlOld[i] !== htmlNew[i]) {
                foundDiff = true;
            }
        }

        const remainderOld = htmlOld.substr(i - 1),
            remainderNew = htmlNew.substr(i - 1);
        let type = ModificationType.TYPE_REPLACEMENT;

        if (remainderOld.length > remainderNew.length) {
            if (remainderOld.substr(remainderOld.length - remainderNew.length) === remainderNew) {
                type = ModificationType.TYPE_DELETION;
            }
        } else if (remainderOld.length < remainderNew.length) {
            if (remainderNew.substr(remainderNew.length - remainderOld.length) === remainderOld) {
                type = ModificationType.TYPE_INSERTION;
            }
        }

        return type;
    }

    public static addCSSClass(node: Node, className: string) {
        if (node.nodeType !== ELEMENT_NODE) {
            return;
        }
        const element = <Element>node;
        const classesStr = element.getAttribute('class');
        const classes = classesStr ? classesStr.split(' ') : [];
        if (classes.indexOf(className) === -1) {
            classes.push(className);
        }
        element.setAttribute('class', classes.join(' '));
    }

    public static removeCSSClass(node: Node, className: string) {
        if (node.nodeType !== ELEMENT_NODE) {
            return;
        }
        const element = <Element>node;
        const classesStr = element.getAttribute('class');
        const newClasses = [];
        const classes = classesStr ? classesStr.split(' ') : [];
        for (let i = 0; i < classes.length; i++) {
            if (classes[i] !== className) {
                newClasses.push(classes[i]);
            }
        }
        if (newClasses.length === 0) {
            element.removeAttribute('class');
        } else {
            element.setAttribute('class', newClasses.join(' '));
        }
    }

    /**
     * Adapted from http://ejohn.org/projects/javascript-diff-algorithm/
     * by John Resig, MIT License
     * @param {array} oldArr
     * @param {array} newArr
     * @returns {object}
     */
    public static diff(oldArr: any, newArr: any) {
        const ns = {},
            os = {};
        let i;

        for (i = 0; i < newArr.length; i++) {
            if (ns[newArr[i]] === undefined) {
                ns[newArr[i]] = { rows: [], o: null };
            }
            ns[newArr[i]].rows.push(i);
        }

        for (i = 0; i < oldArr.length; i++) {
            if (os[oldArr[i]] === undefined) {
                os[oldArr[i]] = { rows: [], n: null };
            }
            os[oldArr[i]].rows.push(i);
        }

        for (i in ns) {
            if (ns[i].rows.length === 1 && typeof os[i] !== 'undefined' && os[i].rows.length === 1) {
                newArr[ns[i].rows[0]] = { text: newArr[ns[i].rows[0]], row: os[i].rows[0] };
                oldArr[os[i].rows[0]] = { text: oldArr[os[i].rows[0]], row: ns[i].rows[0] };
            }
        }

        for (i = 0; i < newArr.length - 1; i++) {
            if (
                newArr[i].text !== null &&
                newArr[i + 1].text === undefined &&
                newArr[i].row + 1 < oldArr.length &&
                oldArr[newArr[i].row + 1].text === undefined &&
                newArr[i + 1] === oldArr[newArr[i].row + 1]
            ) {
                newArr[i + 1] = { text: newArr[i + 1], row: newArr[i].row + 1 };
                oldArr[newArr[i].row + 1] = { text: oldArr[newArr[i].row + 1], row: i + 1 };
            }
        }

        for (i = newArr.length - 1; i > 0; i--) {
            if (
                newArr[i].text !== null &&
                newArr[i - 1].text === undefined &&
                newArr[i].row > 0 &&
                oldArr[newArr[i].row - 1].text === undefined &&
                newArr[i - 1] === oldArr[newArr[i].row - 1]
            ) {
                newArr[i - 1] = { text: newArr[i - 1], row: newArr[i].row - 1 };
                oldArr[newArr[i].row - 1] = { text: oldArr[newArr[i].row - 1], row: i - 1 };
            }
        }

        return { o: oldArr, n: newArr };
    }

    private static tokenizeHtml(str: string): string[] {
        const splitArrayEntriesEmbedSeparator = function(arrIn: string[], by: string, prepend: boolean) {
            const newArr = [];
            for (let i = 0; i < arrIn.length; i++) {
                if (arrIn[i][0] === '<' && (by === ' ' || by === '\n')) {
                    // Don't split HTML tags
                    newArr.push(arrIn[i]);
                    continue;
                }

                const parts = arrIn[i].split(by);
                if (parts.length === 1) {
                    newArr.push(arrIn[i]);
                } else {
                    let j;
                    if (prepend) {
                        if (parts[0] !== '') {
                            newArr.push(parts[0]);
                        }
                        for (j = 1; j < parts.length; j++) {
                            newArr.push(by + parts[j]);
                        }
                    } else {
                        for (j = 0; j < parts.length - 1; j++) {
                            newArr.push(parts[j] + by);
                        }
                        if (parts[parts.length - 1] !== '') {
                            newArr.push(parts[parts.length - 1]);
                        }
                    }
                }
            }
            return newArr;
        };
        const splitArrayEntriesSplitSeparator = function(arrIn: string[], by: string) {
            const newArr = [];
            for (let i = 0; i < arrIn.length; i++) {
                if (arrIn[i][0] === '<') {
                    newArr.push(arrIn[i]);
                    continue;
                }
                const parts = arrIn[i].split(by);
                for (let j = 0; j < parts.length; j++) {
                    if (j > 0) {
                        newArr.push(by);
                    }
                    newArr.push(parts[j]);
                }
            }
            return newArr;
        };
        let arr = splitArrayEntriesEmbedSeparator([str], '<', true);
        arr = splitArrayEntriesEmbedSeparator(arr, '>', false);
        arr = splitArrayEntriesSplitSeparator(arr, ' ');
        arr = splitArrayEntriesSplitSeparator(arr, '.');
        arr = splitArrayEntriesSplitSeparator(arr, ',');
        arr = splitArrayEntriesSplitSeparator(arr, '!');
        arr = splitArrayEntriesSplitSeparator(arr, '-');
        arr = splitArrayEntriesEmbedSeparator(arr, '\n', false);

        const arrWithoutEmpties = [];
        for (let i = 0; i < arr.length; i++) {
            if (arr[i] !== '') {
                arrWithoutEmpties.push(arr[i]);
            }
        }

        return arrWithoutEmpties;
    }

    /**
     * @param {string} oldStr
     * @param {string} newStr
     * @returns {string}
     */
    private static diffString(oldStr: string, newStr: string): string {
        oldStr = DiffService.normalizeHtmlForDiff(oldStr.replace(/\s+$/, '').replace(/^\s+/, ''));
        newStr = DiffService.normalizeHtmlForDiff(newStr.replace(/\s+$/, '').replace(/^\s+/, ''));

        const out = DiffService.diff(DiffService.tokenizeHtml(oldStr), DiffService.tokenizeHtml(newStr));

        // This fixes the problem tested by "does not lose words when changes are moved X-wise"
        let lastRow = 0;
        for (let z = 0; z < out.n.length; z++) {
            if (out.n[z].row && out.n[z].row > lastRow) {
                lastRow = out.n[z].row;
            }
            if (out.n[z].row && out.n[z].row < lastRow) {
                out.o[out.n[z].row] = out.o[out.n[z].row].text;
                out.n[z] = out.n[z].text;
            }
        }

        let str = '';
        let i;

        if (out.n.length === 0) {
            for (i = 0; i < out.o.length; i++) {
                str += '<del>' + out.o[i] + '</del>';
            }
        } else {
            if (out.n[0].text === undefined) {
                for (let k = 0; k < out.o.length && out.o[k].text === undefined; k++) {
                    str += '<del>' + out.o[k] + '</del>';
                }
            }

            let currOldRow = 0;
            for (i = 0; i < out.n.length; i++) {
                if (out.n[i].text === undefined) {
                    if (out.n[i] !== '') {
                        str += '<ins>' + out.n[i] + '</ins>';
                    }
                } else if (out.n[i].row < currOldRow) {
                    str += '<ins>' + out.n[i].text + '</ins>';
                } else {
                    let pre = '';

                    if (i + 1 < out.n.length && out.n[i + 1].row !== undefined && out.n[i + 1].row > out.n[i].row + 1) {
                        for (let n = out.n[i].row + 1; n < out.n[i + 1].row; n++) {
                            if (out.o[n].text === undefined) {
                                pre += '<del>' + out.o[n] + '</del>';
                            } else {
                                pre += '<del>' + out.o[n].text + '</del>';
                            }
                        }
                    } else {
                        for (let j = out.n[i].row + 1; j < out.o.length && out.o[j].text === undefined; j++) {
                            pre += '<del>' + out.o[j] + '</del>';
                        }
                    }
                    str += out.n[i].text + pre;

                    currOldRow = out.n[i].row;
                }
            }
        }

        return str
            .replace(/^\s+/g, '')
            .replace(/\s+$/g, '')
            .replace(/ {2,}/g, ' ');
    }

    /**
     * @param {string} html
     * @return {boolean}
     * @private
     */
    private static isValidInlineHtml(html: string): boolean {
        // If there are no HTML tags, we assume it's valid and skip further checks
        if (!html.match(/<[^>]*>/)) {
            return true;
        }

        // We check if this is a valid HTML that closes all its tags again using the innerHTML-Hack to correct
        // the string and check if the number of HTML tags changes by this
        const doc = document.createElement('div');
        doc.innerHTML = html;
        const tagsBefore = (html.match(/</g) || []).length;
        const tagsCorrected = (doc.innerHTML.match(/</g) || []).length;
        if (tagsBefore !== tagsCorrected) {
            // The HTML has changed => it was not valid
            return false;
        }

        // If there is any block element inside, we consider it as broken, as this string will be displayed
        // inside of <ins>/<del> tags
        if (html.match(/<(div|p|ul|li|blockquote)\W/i)) {
            return false;
        }

        return true;
    }

    /**
     * @param {string} html
     * @returns {boolean}
     * @private
     */
    private static diffDetectBrokenDiffHtml(html: string): boolean {
        // If other HTML tags are contained within INS/DEL (e.g. "<ins>Test</p></ins>"), let's better be cautious
        // The "!!(found=...)"-construction is only used to make jshint happy :)
        const findDel = /<del>(.*?)<\/del>/gi,
            findIns = /<ins>(.*?)<\/ins>/gi;
        let found, inner;
        while (!!(found = findDel.exec(html))) {
            inner = found[1].replace(/<br[^>]*>/gi, '');
            if (inner.match(/<[^>]*>/)) {
                return true;
            }
        }
        while (!!(found = findIns.exec(html))) {
            inner = found[1].replace(/<br[^>]*>/gi, '');
            if (!DiffService.isValidInlineHtml(inner)) {
                return true;
            }
        }

        // If non of the conditions up to now is met, we consider the diff as being sane
        return false;
    }

    public static addCSSClassToFirstTag(html: string, className: string): string {
        return html.replace(/<[a-z][^>]*>/i, function(match) {
            if (match.match(/class=["'][a-z0-9 _-]*["']/i)) {
                return match.replace(/class=["']([a-z0-9 _-]*)["']/i, function(match2, previousClasses) {
                    return 'class="' + previousClasses + ' ' + className + '"';
                });
            } else {
                return match.substring(0, match.length - 1) + ' class="' + className + '">';
            }
        });
    }

    public static addClassToLastNode(html: string, className: string): string {
        const node = document.createElement('div');
        node.innerHTML = html;
        let foundLast = false;
        for (let i = node.childNodes.length - 1; i >= 0 && !foundLast; i--) {
            if (node.childNodes[i].nodeType === ELEMENT_NODE) {
                const childElement = <Element>node.childNodes[i];
                let classes = [];
                if (childElement.getAttribute('class')) {
                    classes = childElement.getAttribute('class').split(' ');
                }
                classes.push(className);
                childElement.setAttribute(
                    'class',
                    classes
                        .sort()
                        .join(' ')
                        .replace(/^\s+/, '')
                        .replace(/\s+$/, '')
                );
                foundLast = true;
            }
        }
        return node.innerHTML;
    }

    /**
     * This function removes color-Attributes from the styles of this node or a descendant,
     * as they interfer with the green/red color in HTML and PDF
     *
     * For the moment, it is sufficient to do this only in paragraph diff mode, as we fall back to this mode anyway
     * once we encounter SPANs or other tags inside of INS/DEL-tags
     *
     * @param {Element} node
     * @private
     */
    private static removeColorStyles(node: Element) {
        const styles = node.getAttribute('style');
        if (styles && styles.indexOf('color') > -1) {
            const stylesNew = [];
            styles.split(';').forEach(function(style) {
                if (!style.match(/^\s*color\s*:/i)) {
                    stylesNew.push(style);
                }
            });
            if (stylesNew.join(';') === '') {
                node.removeAttribute('style');
            } else {
                node.setAttribute('style', stylesNew.join(';'));
            }
        }
        for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === ELEMENT_NODE) {
                DiffService.removeColorStyles(<Element>node.childNodes[i]);
            }
        }
    }

    /**
     * This fixes a very specific, really weird bug that is tested in the test case "does not a change in a very specific case".
     *
     * @param {string}diffStr
     * @return {string}
     */
    private static fixWrongChangeDetection(diffStr: string): string {
        if (diffStr.indexOf('<del>') === -1 || diffStr.indexOf('<ins>') === -1) {
            return diffStr;
        }

        const findDelGroupFinder = /(?:<del>.*?<\/del>)+/gi;
        let found,
            returnStr = diffStr;

        while (!!(found = findDelGroupFinder.exec(diffStr))) {
            const del = found[0],
                split = returnStr.split(del);

            const findInsGroupFinder = /^(?:<ins>.*?<\/ins>)+/gi,
                foundIns = findInsGroupFinder.exec(split[1]);
            if (foundIns) {
                const ins = foundIns[0];

                let delShortened = del
                    .replace(
                        /<del>((<BR CLASS="os-line-break"><\/del><del>)?(<span[^>]+os-line-number[^>]+?>)(\s|<\/?del>)*<\/span>)<\/del>/gi,
                        ''
                    )
                    .replace(/<\/del><del>/g, '');
                const insConv = ins
                    .replace(/<ins>/g, '<del>')
                    .replace(/<\/ins>/g, '</del>')
                    .replace(/<\/del><del>/g, '');
                if (delShortened.indexOf(insConv) !== -1) {
                    delShortened = delShortened.replace(insConv, '');
                    if (delShortened === '') {
                        returnStr = returnStr.replace(del + ins, del.replace(/<del>/g, '').replace(/<\/del>/g, ''));
                    }
                }
            }
        }
        return returnStr;
    }

    private static serializeDom(node: Node, stripLineNumbers: boolean): string {
        if (node.nodeType === TEXT_NODE) {
            return node.nodeValue.replace(/</g, '&lt;').replace(/>/g, '&gt;');
        }
        if (
            stripLineNumbers &&
            (LinenumberingService.isOsLineNumberNode(<Element>node) ||
                LinenumberingService.isOsLineBreakNode(<Element>node))
        ) {
            return '';
        }
        if (node.nodeName === 'OS-LINEBREAK') {
            return '';
        }
        if (node.nodeName === 'BR') {
            let br = '<BR';
            for (let i = 0; i < node.attributes.length; i++) {
                const attr = node.attributes[i];
                br += ' ' + attr.name + '="' + attr.value + '"';
            }
            return br + '>';
        }

        let html = DiffService.serializeTag(node);
        for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i].nodeType === TEXT_NODE) {
                html += node.childNodes[i].nodeValue
                    .replace(/&/g, '&amp;')
                    .replace(/</g, '&lt;')
                    .replace(/>/g, '&gt;');
            } else if (
                !stripLineNumbers ||
                (!LinenumberingService.isOsLineNumberNode(<Element>node.childNodes[i]) &&
                    !LinenumberingService.isOsLineBreakNode(<Element>node.childNodes[i]))
            ) {
                html += DiffService.serializeDom(node.childNodes[i], stripLineNumbers);
            }
        }
        if (node.nodeType !== DOCUMENT_FRAGMENT_NODE) {
            html += '</' + node.nodeName + '>';
        }

        return html;
    }

    /**
     * When a <li> with a os-split-before-class (set by extractRangeByLineNumbers) is edited when creating a
     * change recommendation and is split again in CKEditor, the second list items also gets that class.
     * This is not correct however, as the second one actually is a new list item. So we need to remove it again.
     *
     * @param {string} html
     * @returns {string}
     */
    public static removeDuplicateClassesInsertedByCkeditor(html: string): string {
        const fragment = DiffService.htmlToFragment(html);
        const items = fragment.querySelectorAll('li.os-split-before');
        for (let i = 0; i < items.length; i++) {
            if (!DiffService.isFirstNonemptyChild(items[i].parentNode, items[i])) {
                DiffService.removeCSSClass(items[i], 'os-split-before');
            }
        }
        return DiffService.serializeDom(fragment, false);
    }

    private diffCache = {
        get: (key: string) => undefined,
        put: (key: string, val: any) => undefined
    }; // @TODO

    public constructor(private lineNumberingService: LinenumberingService) {}

    /**
     * Implementation hint: the first element of "toChildTrace" array needs to be a child element of "node"
     */
    public serializePartialDomToChild(node: Node, toChildTrace: Node[], stripLineNumbers: boolean): string {
        if (LinenumberingService.isOsLineNumberNode(node) || LinenumberingService.isOsLineBreakNode(node)) {
            return '';
        }
        if (node.nodeName === 'OS-LINEBREAK') {
            return '';
        }

        let html = DiffService.serializeTag(node),
            found = false;

        for (let i = 0; i < node.childNodes.length && !found; i++) {
            if (node.childNodes[i] === toChildTrace[0]) {
                found = true;
                const childElement = <Element>node.childNodes[i];
                const remainingTrace = toChildTrace;
                remainingTrace.shift();
                if (!LinenumberingService.isOsLineNumberNode(childElement)) {
                    html += this.serializePartialDomToChild(childElement, remainingTrace, stripLineNumbers);
                }
            } else if (node.childNodes[i].nodeType === TEXT_NODE) {
                html += node.childNodes[i].nodeValue;
            } else {
                const childElement = <Element>node.childNodes[i];
                if (
                    !stripLineNumbers ||
                    (!LinenumberingService.isOsLineNumberNode(childElement) &&
                        !LinenumberingService.isOsLineBreakNode(childElement))
                ) {
                    html += DiffService.serializeDom(childElement, stripLineNumbers);
                }
            }
        }
        if (!found) {
            throw new Error('Inconsistency or invalid call of this function detected (to)');
        }
        return html;
    }

    /**
     * Implementation hint: the first element of "toChildTrace" array needs to be a child element of "node"
     */
    public serializePartialDomFromChild(node: Node, fromChildTrace: Node[], stripLineNumbers: boolean): string {
        if (LinenumberingService.isOsLineNumberNode(node) || LinenumberingService.isOsLineBreakNode(node)) {
            return '';
        }
        if (node.nodeName === 'OS-LINEBREAK') {
            return '';
        }

        let html = '',
            found = false;
        for (let i = 0; i < node.childNodes.length; i++) {
            if (node.childNodes[i] === fromChildTrace[0]) {
                found = true;
                const childElement = <Element>node.childNodes[i];
                const remainingTrace = fromChildTrace;
                remainingTrace.shift();
                if (!LinenumberingService.isOsLineNumberNode(childElement)) {
                    html += this.serializePartialDomFromChild(childElement, remainingTrace, stripLineNumbers);
                }
            } else if (found) {
                if (node.childNodes[i].nodeType === TEXT_NODE) {
                    html += node.childNodes[i].nodeValue;
                } else {
                    const childElement = <Element>node.childNodes[i];
                    if (
                        !stripLineNumbers ||
                        (!LinenumberingService.isOsLineNumberNode(childElement) &&
                            !LinenumberingService.isOsLineBreakNode(childElement))
                    ) {
                        html += DiffService.serializeDom(childElement, stripLineNumbers);
                    }
                }
            }
        }
        if (!found) {
            throw new Error('Inconsistency or invalid call of this function detected (from)');
        }
        if (node.nodeType !== DOCUMENT_FRAGMENT_NODE) {
            html += '</' + node.nodeName + '>';
        }
        return html;
    }

    /**
     * Returns the HTML snippet between two given line numbers.
     *
     * Hint:
     * - The last line (toLine) is not included anymore, as the number refers to the line breaking element at the end of the line
     * - if toLine === null, then everything from fromLine to the end of the fragment is returned
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
     * - previousHtml:      The HTML before the selected area begins (including line numbers)
     * - previousHtmlEndSnippet: A HTML snippet that closes all open tags from previousHtml
     * - followingHtml:     The HTML after the selected area
     * - followingHtmlStartSnippet: A HTML snippet that opens all HTML tags necessary to render "followingHtml"
     *
     *
     * In some cases, the returned HTML tags receive additional CSS classes, providing information both for
     * rendering it and for merging it again correctly.
     * - os-split-*:        These classes are set for all HTML Tags that have been split into two by this process,
     *                      e.g. if the fromLine- or toLine-line-break was somewhere in the middle of this tag.
     *                      If a tag is split, the first one receives "os-split-after", and the second one "os-split-before".
     * For example, for the following string <p>Line 1<br>Line 2<br>Line 3</p>:
     * - extracting line 1 to 2 results in <p class="os-split-after">Line 1</p>
     * - extracting line 2 to 3 results in <p class="os-split-after os-split-before">Line 2</p>
     * - extracting line 3 to null/4 results in <p class="os-split-before">Line 3</p>
     */
    public extractRangeByLineNumbers(htmlIn: string, fromLine: number, toLine: number): ExtractedContent {
        if (typeof htmlIn !== 'string') {
            throw new Error('Invalid call - extractRangeByLineNumbers expects a string as first argument');
        }

        const cacheKey = fromLine + '-' + toLine + '-' + LinenumberingService.djb2hash(htmlIn),
            cached = this.diffCache.get(cacheKey);

        if (cached) {
            return cached;
        }

        const fragment = DiffService.htmlToFragment(htmlIn);

        DiffService.insertInternalLineMarkers(fragment);
        DiffService.insertInternalLiNumbers(fragment);
        if (toLine === null) {
            const internalLineMarkers = fragment.querySelectorAll('OS-LINEBREAK');
            toLine = parseInt(internalLineMarkers[internalLineMarkers.length - 1].getAttribute('data-line-number'), 10);
        }

        const fromLineNode = DiffService.getLineNumberNode(fragment, fromLine),
            toLineNode = toLine ? DiffService.getLineNumberNode(fragment, toLine) : null,
            ancestorData = DiffService.getCommonAncestor(fromLineNode, toLineNode);

        const fromChildTraceRel = ancestorData.trace1,
            fromChildTraceAbs = DiffService.getNodeContextTrace(fromLineNode),
            toChildTraceRel = ancestorData.trace2,
            toChildTraceAbs = DiffService.getNodeContextTrace(toLineNode),
            ancestor = ancestorData.commonAncestor;
        let htmlOut = '',
            outerContextStart = '',
            outerContextEnd = '',
            innerContextStart = '',
            innerContextEnd = '',
            previousHtmlEndSnippet = '',
            followingHtmlStartSnippet = '',
            fakeOl,
            offset;

        fromChildTraceAbs.shift();
        const previousHtml = this.serializePartialDomToChild(fragment, fromChildTraceAbs, false);
        toChildTraceAbs.shift();
        const followingHtml = this.serializePartialDomFromChild(fragment, toChildTraceAbs, false);

        let currNode: Node = fromLineNode,
            isSplit = false;
        while (currNode.parentNode) {
            if (!DiffService.isFirstNonemptyChild(currNode.parentNode, currNode)) {
                isSplit = true;
            }
            if (isSplit) {
                DiffService.addCSSClass(currNode.parentNode, 'os-split-before');
            }
            if (currNode.nodeName !== 'OS-LINEBREAK') {
                previousHtmlEndSnippet += '</' + currNode.nodeName + '>';
            }
            currNode = currNode.parentNode;
        }

        currNode = toLineNode;
        isSplit = false;
        while (currNode.parentNode) {
            if (!DiffService.isFirstNonemptyChild(currNode.parentNode, currNode)) {
                isSplit = true;
            }
            if (isSplit) {
                DiffService.addCSSClass(currNode.parentNode, 'os-split-after');
            }
            if (currNode.parentNode.nodeName === 'OL') {
                const parentElement = <Element>currNode.parentNode;
                fakeOl = parentElement.cloneNode(false);
                offset = parentElement.getAttribute('start')
                    ? parseInt(parentElement.getAttribute('start'), 10) - 1
                    : 0;
                fakeOl.setAttribute(
                    'start',
                    (DiffService.isWithinNthLIOfOL(parentElement, toLineNode) + offset).toString()
                );
                followingHtmlStartSnippet = DiffService.serializeTag(fakeOl) + followingHtmlStartSnippet;
            } else {
                followingHtmlStartSnippet = DiffService.serializeTag(currNode.parentNode) + followingHtmlStartSnippet;
            }
            currNode = currNode.parentNode;
        }

        let found = false;
        isSplit = false;
        for (let i = 0; i < fromChildTraceRel.length && !found; i++) {
            if (fromChildTraceRel[i].nodeName === 'OS-LINEBREAK') {
                found = true;
            } else {
                if (!DiffService.isFirstNonemptyChild(fromChildTraceRel[i], fromChildTraceRel[i + 1])) {
                    isSplit = true;
                }
                if (fromChildTraceRel[i].nodeName === 'OL') {
                    const element = <Element>fromChildTraceRel[i];
                    fakeOl = element.cloneNode(false);
                    offset = element.getAttribute('start') ? parseInt(element.getAttribute('start'), 10) - 1 : 0;
                    fakeOl.setAttribute(
                        'start',
                        (offset + DiffService.isWithinNthLIOfOL(element, fromLineNode)).toString()
                    );
                    innerContextStart += DiffService.serializeTag(fakeOl);
                } else {
                    if (i < fromChildTraceRel.length - 1 && isSplit) {
                        DiffService.addCSSClass(fromChildTraceRel[i], 'os-split-before');
                    }
                    innerContextStart += DiffService.serializeTag(fromChildTraceRel[i]);
                }
            }
        }
        found = false;
        for (let i = 0; i < toChildTraceRel.length && !found; i++) {
            if (toChildTraceRel[i].nodeName === 'OS-LINEBREAK') {
                found = true;
            } else {
                innerContextEnd = '</' + toChildTraceRel[i].nodeName + '>' + innerContextEnd;
            }
        }

        found = false;
        for (let i = 0; i < ancestor.childNodes.length; i++) {
            if (ancestor.childNodes[i] === fromChildTraceRel[0]) {
                found = true;
                fromChildTraceRel.shift();
                htmlOut += this.serializePartialDomFromChild(ancestor.childNodes[i], fromChildTraceRel, true);
            } else if (ancestor.childNodes[i] === toChildTraceRel[0]) {
                found = false;
                toChildTraceRel.shift();
                htmlOut += this.serializePartialDomToChild(ancestor.childNodes[i], toChildTraceRel, true);
            } else if (found === true) {
                htmlOut += DiffService.serializeDom(ancestor.childNodes[i], true);
            }
        }

        currNode = ancestor;
        while (currNode.parentNode) {
            if (currNode.nodeName === 'OL') {
                const currElement = <Element>currNode;
                fakeOl = currElement.cloneNode(false);
                offset = currElement.getAttribute('start') ? parseInt(currElement.getAttribute('start'), 10) - 1 : 0;
                fakeOl.setAttribute(
                    'start',
                    (DiffService.isWithinNthLIOfOL(currElement, fromLineNode) + offset).toString()
                );
                outerContextStart = DiffService.serializeTag(fakeOl) + outerContextStart;
            } else {
                outerContextStart = DiffService.serializeTag(currNode) + outerContextStart;
            }
            outerContextEnd += '</' + currNode.nodeName + '>';
            currNode = currNode.parentNode;
        }

        const ret = {
            html: htmlOut,
            ancestor: ancestor,
            outerContextStart: outerContextStart,
            outerContextEnd: outerContextEnd,
            innerContextStart: innerContextStart,
            innerContextEnd: innerContextEnd,
            previousHtml: previousHtml,
            previousHtmlEndSnippet: previousHtmlEndSnippet,
            followingHtml: followingHtml,
            followingHtmlStartSnippet: followingHtmlStartSnippet
        };

        this.diffCache.put(cacheKey, ret);
        return ret;
    }

    /*
     * Convenience method that takes the html-attribute from an extractRangeByLineNumbers()-method,
     * wraps it with the context and adds line numbers.
     */
    public formatDiffWithLineNumbers(diff: ExtractedContent, lineLength: number, firstLine: number) {
        let text =
            diff.outerContextStart + diff.innerContextStart + diff.html + diff.innerContextEnd + diff.outerContextEnd;
        text = this.lineNumberingService.insertLineNumbers(text, lineLength, null, null, firstLine);
        return text;
    }

    /*
     * This is a workardoun to prevent the last word of the inserted text from accidently being merged with the
     * first word of the following line.
     *
     * This happens as trailing spaces in the change recommendation's text are frequently stripped,
     * which is pretty nasty if the original text goes on after the affected line. So we insert a space
     * if the original line ends with one.
     */
    private insertDanglingSpace(element: Element | DocumentFragment) {
        if (element.childNodes.length > 0) {
            let lastChild = element.childNodes[element.childNodes.length - 1];
            if (
                lastChild.nodeType === TEXT_NODE &&
                !lastChild.nodeValue.match(/[\S]/) &&
                element.childNodes.length > 1
            ) {
                // If the text node only contains whitespaces, chances are high it's just space between block elmeents,
                // like a line break between </LI> and </UL>
                lastChild = element.childNodes[element.childNodes.length - 2];
            }
            if (lastChild.nodeType === TEXT_NODE) {
                if (lastChild.nodeValue === '' || lastChild.nodeValue.substr(-1) !== ' ') {
                    lastChild.nodeValue += ' ';
                }
            } else {
                this.insertDanglingSpace(<Element>lastChild);
            }
        }
    }

    /*
     * This functions merges to arrays of nodes. The last element of nodes1 and the first element of nodes2
     * are merged, if they are of the same type.
     *
     * This is done recursively until a TEMPLATE-Tag is is found, which was inserted in this.replaceLines.
     * Using a TEMPLATE-Tag is a rather dirty hack, as it is allowed inside of any other element, including <ul>.
     *
     */
    public replaceLinesMergeNodeArrays(nodes1: Node[], nodes2: Node[]): Node[] {
        if (nodes1.length === 0) {
            return nodes2;
        }
        if (nodes2.length === 0) {
            return nodes1;
        }

        const out = [];
        for (let i = 0; i < nodes1.length - 1; i++) {
            out.push(nodes1[i]);
        }

        const lastNode = nodes1[nodes1.length - 1],
            firstNode = nodes2[0];
        if (lastNode.nodeType === TEXT_NODE && firstNode.nodeType === TEXT_NODE) {
            const newTextNode = lastNode.ownerDocument.createTextNode(lastNode.nodeValue + firstNode.nodeValue);
            out.push(newTextNode);
        } else if (lastNode.nodeName === firstNode.nodeName) {
            const newNode = lastNode.ownerDocument.createElement(lastNode.nodeName);
            for (let i = 0; i < lastNode.attributes.length; i++) {
                const attr = lastNode.attributes[i];
                newNode.setAttribute(attr.name, attr.value);
            }

            // Remove #text nodes inside of List elements (OL/UL), as they are confusing
            let lastChildren, firstChildren;
            if (lastNode.nodeName === 'OL' || lastNode.nodeName === 'UL') {
                lastChildren = [];
                firstChildren = [];
                for (let i = 0; i < firstNode.childNodes.length; i++) {
                    if (firstNode.childNodes[i].nodeType === ELEMENT_NODE) {
                        firstChildren.push(firstNode.childNodes[i]);
                    }
                }
                for (let i = 0; i < lastNode.childNodes.length; i++) {
                    if (lastNode.childNodes[i].nodeType === ELEMENT_NODE) {
                        lastChildren.push(lastNode.childNodes[i]);
                    }
                }
            } else {
                lastChildren = lastNode.childNodes;
                firstChildren = firstNode.childNodes;
            }

            const children = this.replaceLinesMergeNodeArrays(lastChildren, firstChildren);
            for (let i = 0; i < children.length; i++) {
                newNode.appendChild(children[i]);
            }

            out.push(newNode);
        } else {
            if (lastNode.nodeName !== 'TEMPLATE') {
                out.push(lastNode);
            }
            if (firstNode.nodeName !== 'TEMPLATE') {
                out.push(firstNode);
            }
        }

        for (let i = 1; i < nodes2.length; i++) {
            out.push(nodes2[i]);
        }

        return out;
    }

    /**
     * This returns the line number range in which changes (insertions, deletions) are encountered.
     * As in extractRangeByLineNumbers(), "to" refers to the line breaking element at the end, i.e. the start of the following line.
     *
     * @param {string} diffHtml
     */
    public detectAffectedLineRange(diffHtml: string): LineRange {
        const cacheKey = LinenumberingService.djb2hash(diffHtml),
            cached = this.diffCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        const fragment = DiffService.htmlToFragment(diffHtml);

        DiffService.insertInternalLineMarkers(fragment);
        DiffService.insertInternalLiNumbers(fragment);

        const changes = fragment.querySelectorAll('ins, del, .insert, .delete'),
            firstChange = changes.item(0),
            lastChange = changes.item(changes.length - 1);

        if (!firstChange || !lastChange) {
            // There are no changes
            return null;
        }

        const firstTrace = DiffService.getNodeContextTrace(firstChange);
        let lastLineNumberBefore = null;
        for (let j = firstTrace.length - 1; j >= 0 && lastLineNumberBefore === null; j--) {
            const prevSiblings = DiffService.getAllPrevSiblingsReversed(firstTrace[j]);
            for (let i = 0; i < prevSiblings.length && lastLineNumberBefore === null; i++) {
                lastLineNumberBefore = DiffService.getLastLineNumberNode(prevSiblings[i]);
            }
        }

        const lastTrace = DiffService.getNodeContextTrace(lastChange);
        let firstLineNumberAfter = null;
        for (let j = lastTrace.length - 1; j >= 0 && firstLineNumberAfter === null; j--) {
            const nextSiblings = DiffService.getAllNextSiblings(lastTrace[j]);
            for (let i = 0; i < nextSiblings.length && firstLineNumberAfter === null; i++) {
                firstLineNumberAfter = DiffService.getFirstLineNumberNode(nextSiblings[i]);
            }
        }

        const range = {
            from: parseInt(lastLineNumberBefore.getAttribute('data-line-number'), 10),
            to: parseInt(firstLineNumberAfter.getAttribute('data-line-number'), 10)
        };

        this.diffCache.put(cacheKey, range);
        return range;
    }

    /**
     * Removes .delete-nodes and <del>-Tags (including content)
     * Removes the .insert-classes and the wrapping <ins>-Tags (while maintaining content)
     * @param html
     */
    public diffHtmlToFinalText(html: string): string {
        const fragment = DiffService.htmlToFragment(html);

        const delNodes = fragment.querySelectorAll('.delete, del');
        for (let i = 0; i < delNodes.length; i++) {
            delNodes[i].parentNode.removeChild(delNodes[i]);
        }

        const insNodes = fragment.querySelectorAll('ins');
        for (let i = 0; i < insNodes.length; i++) {
            const ins = insNodes[i];
            while (ins.childNodes.length > 0) {
                const child = ins.childNodes.item(0);
                ins.removeChild(child);
                ins.parentNode.insertBefore(child, ins);
            }
            ins.parentNode.removeChild(ins);
        }

        const insertNodes = fragment.querySelectorAll('.insert');
        for (let i = 0; i < insertNodes.length; i++) {
            DiffService.removeCSSClass(insertNodes[i], 'insert');
        }

        return DiffService.serializeDom(fragment, false);
    }

    /**
     * @param {string} oldHtml
     * @param {string} newHTML
     * @param {number} fromLine
     * @param {number} toLine
     */
    public replaceLines(oldHtml: string, newHTML: string, fromLine: number, toLine: number): string {
        const data = this.extractRangeByLineNumbers(oldHtml, fromLine, toLine),
            previousHtml = data.previousHtml + '<TEMPLATE></TEMPLATE>' + data.previousHtmlEndSnippet,
            previousFragment = DiffService.htmlToFragment(previousHtml),
            followingHtml = data.followingHtmlStartSnippet + '<TEMPLATE></TEMPLATE>' + data.followingHtml,
            followingFragment = DiffService.htmlToFragment(followingHtml),
            newFragment = DiffService.htmlToFragment(newHTML);

        if (data.html.length > 0 && data.html.substr(-1) === ' ') {
            this.insertDanglingSpace(newFragment);
        }

        let merged = this.replaceLinesMergeNodeArrays(
            Array.prototype.slice.call(previousFragment.childNodes),
            Array.prototype.slice.call(newFragment.childNodes)
        );
        merged = this.replaceLinesMergeNodeArrays(merged, Array.prototype.slice.call(followingFragment.childNodes));

        const mergedFragment = document.createDocumentFragment();
        for (let i = 0; i < merged.length; i++) {
            mergedFragment.appendChild(merged[i]);
        }

        const forgottenTemplates = mergedFragment.querySelectorAll('TEMPLATE');
        for (let i = 0; i < forgottenTemplates.length; i++) {
            const el = forgottenTemplates[i];
            el.parentNode.removeChild(el);
        }

        const forgottenSplitClasses = mergedFragment.querySelectorAll('.os-split-before, .os-split-after');
        for (let i = 0; i < forgottenSplitClasses.length; i++) {
            DiffService.removeCSSClass(forgottenSplitClasses[i], 'os-split-before');
            DiffService.removeCSSClass(forgottenSplitClasses[i], 'os-split-after');
        }

        return DiffService.serializeDom(mergedFragment, true);
    }

    public addDiffMarkup(
        originalHTML: string,
        newHTML: string,
        fromLine: number,
        toLine: number,
        diffFormatterCb: any
    ) {
        // @TODO
        const data = this.extractRangeByLineNumbers(originalHTML, fromLine, toLine),
            previousHtml = data.previousHtml + '<TEMPLATE></TEMPLATE>' + data.previousHtmlEndSnippet,
            previousFragment = DiffService.htmlToFragment(previousHtml),
            followingHtml = data.followingHtmlStartSnippet + '<TEMPLATE></TEMPLATE>' + data.followingHtml,
            followingFragment = DiffService.htmlToFragment(followingHtml),
            newFragment = DiffService.htmlToFragment(newHTML),
            oldHTML =
                data.outerContextStart +
                data.innerContextStart +
                data.html +
                data.innerContextEnd +
                data.outerContextEnd,
            oldFragment = DiffService.htmlToFragment(oldHTML);

        const diffFragment = diffFormatterCb(oldFragment, newFragment);

        const mergedFragment = document.createDocumentFragment();
        while (previousFragment.firstChild) {
            const el = previousFragment.firstChild;
            previousFragment.removeChild(el);
            mergedFragment.appendChild(el);
        }
        while (diffFragment.firstChild) {
            const el = diffFragment.firstChild;
            diffFragment.removeChild(el);
            mergedFragment.appendChild(el);
        }
        while (followingFragment.firstChild) {
            const el = followingFragment.firstChild;
            followingFragment.removeChild(el);
            mergedFragment.appendChild(el);
        }

        const forgottenTemplates = mergedFragment.querySelectorAll('TEMPLATE');
        for (let i = 0; i < forgottenTemplates.length; i++) {
            const el = forgottenTemplates[i];
            el.parentNode.removeChild(el);
        }

        return DiffService.serializeDom(mergedFragment, true);
    }

    /**
     *
     * @param {string} oldText
     * @param {string} newText
     * @param {number|null} lineLength
     * @param {number|null} firstLineNumber
     */
    private diffParagraphs(oldText: string, newText: string, lineLength: number, firstLineNumber: number): string {
        let oldTextWithBreaks, newTextWithBreaks, currChild;

        if (lineLength !== null) {
            oldTextWithBreaks = this.lineNumberingService.insertLineNumbersNode(
                oldText,
                lineLength,
                null,
                firstLineNumber
            );
            newTextWithBreaks = this.lineNumberingService.insertLineNumbersNode(
                newText,
                lineLength,
                null,
                firstLineNumber
            );
        } else {
            oldTextWithBreaks = document.createElement('div');
            oldTextWithBreaks.innerHTML = oldText;
            newTextWithBreaks = document.createElement('div');
            newTextWithBreaks.innerHTML = newText;
        }

        for (let i = 0; i < oldTextWithBreaks.childNodes.length; i++) {
            currChild = oldTextWithBreaks.childNodes[i];
            if (currChild.nodeType === TEXT_NODE) {
                const wrapDel = document.createElement('del');
                oldTextWithBreaks.insertBefore(wrapDel, currChild);
                oldTextWithBreaks.removeChild(currChild);
                wrapDel.appendChild(currChild);
            } else {
                DiffService.addCSSClass(currChild, 'delete');
                DiffService.removeColorStyles(currChild);
            }
        }
        for (let i = 0; i < newTextWithBreaks.childNodes.length; i++) {
            currChild = newTextWithBreaks.childNodes[i];
            if (currChild.nodeType === TEXT_NODE) {
                const wrapIns = document.createElement('ins');
                newTextWithBreaks.insertBefore(wrapIns, currChild);
                newTextWithBreaks.removeChild(currChild);
                wrapIns.appendChild(currChild);
            } else {
                DiffService.addCSSClass(currChild, 'insert');
                DiffService.removeColorStyles(currChild);
            }
        }

        const mergedFragment = document.createDocumentFragment();
        let el;
        while (oldTextWithBreaks.firstChild) {
            el = oldTextWithBreaks.firstChild;
            oldTextWithBreaks.removeChild(el);
            mergedFragment.appendChild(el);
        }
        while (newTextWithBreaks.firstChild) {
            el = newTextWithBreaks.firstChild;
            newTextWithBreaks.removeChild(el);
            mergedFragment.appendChild(el);
        }

        return DiffService.serializeDom(mergedFragment, false);
    }

    /**
     * This function calculates the diff between two strings and tries to fix problems with the resulting HTML.
     * If lineLength and firstLineNumber is given, line numbers will be returned es well
     *
     * @param {string} htmlOld
     * @param {string} htmlNew
     * @param {number} lineLength - optional
     * @param {number} firstLineNumber - optional
     * @returns {string}
     */
    public diff(htmlOld: string, htmlNew: string, lineLength: number = null, firstLineNumber: number = null): string {
        const cacheKey =
                lineLength +
                ' ' +
                firstLineNumber +
                ' ' +
                LinenumberingService.djb2hash(htmlOld) +
                LinenumberingService.djb2hash(htmlNew),
            cached = this.diffCache.get(cacheKey);
        if (cached) {
            return cached;
        }

        // This fixes a really strange artefact with the diff that occures under the following conditions:
        // - The first tag of the two texts is identical, e.g. <p>
        // - A change happens in the next tag, e.g. inserted text
        // - The first tag occures a second time in the text, e.g. another <p>
        // In this condition, the first tag is deleted first and inserted afterwards again
        // Test case: "does not break when an insertion followes a beginning tag occuring twice"
        // The work around inserts to tags at the beginning and removes them afterwards again,
        // to make sure this situation does not happen (and uses invisible pseudo-tags in case something goes wrong)
        const workaroundPrepend = '<DUMMY><PREPEND>';

        // os-split-after should not be considered for detecting changes in paragraphs, so we strip it here
        // and add it afterwards.
        // We only do this for P for now, as for more complex types like UL/LI that tend to be nestend,
        // information would get lost by this that we will need to recursively merge it again later on.
        let oldIsSplitAfter = false,
            newIsSplitAfter = false;
        htmlOld = htmlOld.replace(/(\s*<p[^>]+class\s*=\s*["'][^"']*)os-split-after/gi, function(match, beginning) {
            oldIsSplitAfter = true;
            return beginning;
        });
        htmlNew = htmlNew.replace(/(\s*<p[^>]+class\s*=\s*["'][^"']*)os-split-after/gi, function(match, beginning) {
            newIsSplitAfter = true;
            return beginning;
        });

        // Performing the actual diff
        const str = DiffService.diffString(workaroundPrepend + htmlOld, workaroundPrepend + htmlNew);
        let diffUnnormalized = str
            .replace(/^\s+/g, '')
            .replace(/\s+$/g, '')
            .replace(/ {2,}/g, ' ');

        diffUnnormalized = DiffService.fixWrongChangeDetection(diffUnnormalized);

        // Remove <del> tags that only delete line numbers
        // We need to do this before removing </del><del> as done in one of the next statements
        diffUnnormalized = diffUnnormalized.replace(
            /<del>((<BR CLASS="os-line-break"><\/del><del>)?(<span[^>]+os-line-number[^>]+?>)(\s|<\/?del>)*<\/span>)<\/del>/gi,
            function(found, tag, br, span) {
                return (br !== undefined ? br : '') + span + ' </span>';
            }
        );

        diffUnnormalized = diffUnnormalized.replace(/<\/ins><ins>/gi, '').replace(/<\/del><del>/gi, '');

        // Move whitespaces around inserted P's out of the INS-tag
        diffUnnormalized = diffUnnormalized.replace(/<ins>(\s*)(<p( [^>]*)?>[\s\S]*?<\/p>)(\s*)<\/ins>/gim, function(
            match,
            whiteBefore,
            inner,
            tagInner,
            whiteAfter
        ) {
            return (
                whiteBefore +
                inner
                    .replace(/<p( [^>]*)?>/gi, function(match2) {
                        return match2 + '<ins>';
                    })
                    .replace(/<\/p>/gi, '</ins></p>') +
                whiteAfter
            );
        });

        // Fixes HTML produced by the diff like this:
        // from: <del></P></del><ins> Inserted Text</P>\n<P>More inserted text</P></ins>
        // into: <ins> Inserted Text</ins></P>\n<P>More inserted text</ins></P>
        diffUnnormalized = diffUnnormalized.replace(
            /<del><\/p><\/del><ins>([\s\S]*?)<\/p><\/ins>/gim,
            '<ins>$1</ins></p>'
        );
        diffUnnormalized = diffUnnormalized.replace(/<ins>[\s\S]*?<\/ins>/gim, function(match) {
            return match.replace(/(<\/p>\s*<p>)/gi, '</ins>$1<ins>');
        });

        // If only a few characters of a word have changed, don't display this as a replacement of the whole word,
        // but only of these specific characters
        diffUnnormalized = diffUnnormalized.replace(
            /<del>([a-z0-9,_-]* ?)<\/del><ins>([a-z0-9,_-]* ?)<\/ins>/gi,
            function(found, oldText, newText) {
                let foundDiff = false,
                    commonStart = '',
                    commonEnd = '',
                    remainderOld = oldText,
                    remainderNew = newText;

                while (remainderOld.length > 0 && remainderNew.length > 0 && !foundDiff) {
                    if (remainderOld[0] === remainderNew[0]) {
                        commonStart += remainderOld[0];
                        remainderOld = remainderOld.substr(1);
                        remainderNew = remainderNew.substr(1);
                    } else {
                        foundDiff = true;
                    }
                }

                foundDiff = false;
                while (remainderOld.length > 0 && remainderNew.length > 0 && !foundDiff) {
                    if (remainderOld[remainderOld.length - 1] === remainderNew[remainderNew.length - 1]) {
                        commonEnd = remainderOld[remainderOld.length - 1] + commonEnd;
                        remainderNew = remainderNew.substr(0, remainderNew.length - 1);
                        remainderOld = remainderOld.substr(0, remainderOld.length - 1);
                    } else {
                        foundDiff = true;
                    }
                }

                let out = commonStart;
                if (remainderOld !== '') {
                    out += '<del>' + remainderOld + '</del>';
                }
                if (remainderNew !== '') {
                    out += '<ins>' + remainderNew + '</ins>';
                }
                out += commonEnd;

                return out;
            }
        );

        // Replace spaces in line numbers by &nbsp;
        diffUnnormalized = diffUnnormalized.replace(/<span[^>]+os-line-number[^>]+?>\s*<\/span>/gi, function(found) {
            return found.toLowerCase().replace(/> <\/span/gi, '>&nbsp;</span');
        });

        if (diffUnnormalized.substr(0, workaroundPrepend.length) === workaroundPrepend) {
            diffUnnormalized = diffUnnormalized.substring(workaroundPrepend.length);
        }

        let diff: string;
        if (DiffService.diffDetectBrokenDiffHtml(diffUnnormalized)) {
            diff = this.diffParagraphs(htmlOld, htmlNew, lineLength, firstLineNumber);
        } else {
            diffUnnormalized = diffUnnormalized.replace(/<ins>.*?(\n.*?)*<\/ins>/gi, function(found) {
                found = found.replace(/<(div|p|li)[^>]*>/gi, function(match) {
                    return match + '<ins>';
                });
                found = found.replace(/<\/(div|p|li)[^>]*>/gi, function(match) {
                    return '</ins>' + match;
                });
                return found;
            });
            diffUnnormalized = diffUnnormalized.replace(/<del>.*?(\n.*?)*<\/del>/gi, function(found) {
                found = found.replace(/<(div|p|li)[^>]*>/gi, function(match) {
                    return match + '<del>';
                });
                found = found.replace(/<\/(div|p|li)[^>]*>/gi, function(match) {
                    return '</del>' + match;
                });
                return found;
            });
            diffUnnormalized = diffUnnormalized.replace(/^<del><p>(.*)<\/p><\/del>$/gi, function(match, inner) {
                return '<p>' + inner + '</p>';
            });

            let node: Element = document.createElement('div');
            node.innerHTML = diffUnnormalized;
            diff = node.innerHTML;

            if (lineLength !== null && firstLineNumber !== null) {
                node = this.lineNumberingService.insertLineNumbersNode(diff, lineLength, null, firstLineNumber);
                diff = node.innerHTML;
            }
        }

        if (oldIsSplitAfter || newIsSplitAfter) {
            diff = DiffService.addClassToLastNode(diff, 'os-split-after');
        }

        this.diffCache.put(cacheKey, diff);
        return diff;
    }
}
