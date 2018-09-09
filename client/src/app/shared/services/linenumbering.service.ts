import { Injectable } from '@angular/core';

const ELEMENT_NODE = 1;
const TEXT_NODE = 3;

interface BreakablePoint {
    node: object; // @TODO TextNode
    offset: number;
}

interface LineNumberRange {
    from: number;
    to: number;
}

interface SectionHeading {
    lineNumber: number;
    level: number;
    text: string;
}

/**
 * Authenticates an OpenSlides user with username and password
 */
@Injectable({
    providedIn: 'root'
})
export class LinenumberingService {
    public static djb2hash(str: string): string {
        let hash = 5381;
        let char;
        for (let i = 0; i < str.length; i++) {
            char = str.charCodeAt(i);
            // tslint:disable-next-line:no-bitwise
            hash = (hash << 5) + hash + char;
        }
        return hash.toString();
    }

    private static isInlineElement(node: Element): boolean {
        const inlineElements = [
            'SPAN',
            'A',
            'EM',
            'S',
            'B',
            'I',
            'STRONG',
            'U',
            'BIG',
            'SMALL',
            'SUB',
            'SUP',
            'TT',
            'INS',
            'DEL',
            'STRIKE'
        ];
        return inlineElements.indexOf(node.nodeName) > -1;
    }

    public static isOsLineBreakNode(node: Node): boolean {
        let isLineBreak = false;
        if (node && node.nodeType === ELEMENT_NODE) {
            const element = <Element>node;
            if (element.nodeName === 'BR' && element.hasAttribute('class')) {
                const classes = element.getAttribute('class').split(' ');
                if (classes.indexOf('os-line-break') > -1) {
                    isLineBreak = true;
                }
            }
        }
        return isLineBreak;
    }

    public static isOsLineNumberNode(node: Node): boolean {
        let isLineNumber = false;
        if (node && node.nodeType === ELEMENT_NODE) {
            const element = <Element>node;
            if (node.nodeName === 'SPAN' && element.hasAttribute('class')) {
                const classes = element.getAttribute('class').split(' ');
                if (classes.indexOf('os-line-number') > -1) {
                    isLineNumber = true;
                }
            }
        }
        return isLineNumber;
    }

    private static getLineNumberNode(fragment: DocumentFragment, lineNumber: number): Element {
        return fragment.querySelector('.os-line-number.line-number-' + lineNumber);
    }

    private static htmlToFragment(html: string): DocumentFragment {
        const fragment: DocumentFragment = document.createDocumentFragment(),
            div = document.createElement('DIV');
        div.innerHTML = html;
        while (div.childElementCount) {
            const child = div.childNodes[0];
            div.removeChild(child);
            fragment.appendChild(child);
        }
        return fragment;
    }

    private static fragmentToHtml(fragment: DocumentFragment): string {
        const div: Element = document.createElement('DIV');
        while (fragment.firstChild) {
            const child = fragment.firstChild;
            fragment.removeChild(child);
            div.appendChild(child);
        }
        return div.innerHTML;
    }

    private static createLineBreak(): Element {
        const br = document.createElement('br');
        br.setAttribute('class', 'os-line-break');
        return br;
    }

    /**
     * Moves line breaking and line numbering markup before inline elements
     *
     * @param innerNode
     * @param outerNode
     * @private
     */
    private static moveLeadingLineBreaksToOuterNode(innerNode: Element, outerNode: Element) {
        if (LinenumberingService.isInlineElement(innerNode)) {
            const firstChild = <Element>innerNode.firstChild;
            if (LinenumberingService.isOsLineBreakNode(firstChild)) {
                const br = innerNode.firstChild;
                innerNode.removeChild(br);
                outerNode.appendChild(br);
            }
            if (LinenumberingService.isOsLineNumberNode(firstChild)) {
                const span = innerNode.firstChild;
                innerNode.removeChild(span);
                outerNode.appendChild(span);
            }
        }
    }

    public static calcBlockNodeLength(node: Element, oldLength: number): number {
        let newLength = oldLength;
        switch (node.nodeName) {
            case 'LI':
                newLength -= 5;
                break;
            case 'BLOCKQUOTE':
                newLength -= 20;
                break;
            case 'DIV':
            case 'P':
                const styles = node.getAttribute('style');
                let padding = 0;
                if (styles) {
                    const leftpad = styles.split('padding-left:');
                    if (leftpad.length > 1) {
                        padding += parseInt(leftpad[1], 10);
                    }
                    const rightpad = styles.split('padding-right:');
                    if (rightpad.length > 1) {
                        padding += parseInt(rightpad[1], 10);
                    }
                    newLength -= padding / 5;
                }
                break;
            case 'H1':
                newLength *= 0.66;
                break;
            case 'H2':
                newLength *= 0.75;
                break;
            case 'H3':
                newLength *= 0.85;
                break;
        }
        return Math.ceil(newLength);
    }

    public static nodesToHtml(nodes: Element[]): string {
        const root = document.createElement('div');
        nodes.forEach(node => {
            root.appendChild(node);
        });
        return root.innerHTML;
    }

    /**
     * @param {string} html
     * @returns {object}
     *          {"from": 23, "to": 42} ; "to" refers to the line breaking element at the end of the last line,
     *                                   i.e. the line number of the following line
     */
    public static getLineNumberRange(html: string): LineNumberRange {
        const fragment = LinenumberingService.htmlToFragment(html);
        const range = {
            from: null,
            to: null
        };
        const lineNumbers = fragment.querySelectorAll('.os-line-number');
        for (let i = 0; i < lineNumbers.length; i++) {
            const node = lineNumbers.item(i);
            const number = parseInt(node.getAttribute('data-line-number'), 10);
            if (range.from === null || number < range.from) {
                range.from = number;
            }
            if (range.to === null || number + 1 > range.to) {
                range.to = number + 1;
            }
        }
        return range;
    }

    /**
     * @param {string} html
     */
    public static getHeadingsWithLineNumbers(html: string): SectionHeading[] {
        const fragment = LinenumberingService.htmlToFragment(html);
        const headings = [];
        const headingNodes = fragment.querySelectorAll('h1, h2, h3, h4, h5, h6');
        for (let i = 0; i < headingNodes.length; i++) {
            const heading = <HTMLElement>headingNodes.item(i);
            const linenumbers = heading.querySelectorAll('.os-line-number');
            if (linenumbers.length > 0) {
                const number = parseInt(linenumbers.item(0).getAttribute('data-line-number'), 10);
                headings.push({
                    lineNumber: number,
                    level: parseInt(heading.nodeName.substr(1), 10),
                    text: heading.innerText.replace(/^\s/, '').replace(/\s$/, '')
                });
            }
        }
        return headings.sort(function(heading1, heading2) {
            if (heading1.lineNumber < heading2.lineNumber) {
                return 0;
            } else if (heading1.lineNumber > heading2.lineNumber) {
                return 1;
            } else {
                return 0;
            }
        });
    }

    /**
     * @param {Element} node
     * @returns {array}
     * @private
     */
    public static splitNodeToParagraphs(node: Element | DocumentFragment): Element[] {
        const elements = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            const childNode = node.childNodes.item(i);

            if (childNode.nodeType === TEXT_NODE) {
                continue;
            }
            if (childNode.nodeName === 'UL' || childNode.nodeName === 'OL') {
                const childElement = <Element>childNode;
                let start = 1;
                if (childElement.getAttribute('start') !== null) {
                    start = parseInt(childElement.getAttribute('start'), 10);
                }
                for (let j = 0; j < childElement.childNodes.length; j++) {
                    if (childElement.childNodes.item(j).nodeType === TEXT_NODE) {
                        continue;
                    }
                    const newParent = <Element>childElement.cloneNode(false);
                    if (childElement.nodeName === 'OL') {
                        newParent.setAttribute('start', start.toString());
                    }
                    newParent.appendChild(childElement.childNodes.item(j).cloneNode(true));
                    elements.push(newParent);
                    start++;
                }
            } else {
                elements.push(childNode);
            }
        }
        return elements;
    }

    /**
     * Splitting the text into paragraphs:
     * - Each root-level-element is considered as a paragraph.
     *   Inline-elements at root-level are not expected and treated as block elements.
     *   Text-nodes at root-level are not expected and ignored. Every text needs to be wrapped e.g. by <p> or <div>.
     * - If a UL or OL is encountered, paragraphs are defined by the child-LI-elements.
     *   List items of nested lists are not considered as a paragraph of their own.
     *
     * @param {string} html
     * @return {string[]}
     */
    public static splitToParagraphs(html: string): string[] {
        const fragment = LinenumberingService.htmlToFragment(html);
        return LinenumberingService.splitNodeToParagraphs(fragment).map(function(node) {
            return node.outerHTML;
        });
    }

    // Counts the number of characters in the current line, beyond singe nodes.
    // Needs to be resetted after each line break and after entering a new block node.
    private currentInlineOffset: number = null;

    // The last position of a point suitable for breaking the line. null or an object with the following values:
    // - node: the node that contains the position. Guaranteed to be a TextNode
    // - offset: the offset of the breaking characters (like the space)
    // Needs to be resetted after each line break and after entering a new block node.
    private lastInlineBreakablePoint: BreakablePoint = null;

    // The line number counter
    private currentLineNumber: number = null;

    // Indicates that we just entered a block element and we want to add a line number without line break at the beginning.
    private prependLineNumberToFirstText = false;

    // A workaround to prevent double line numbers
    private ignoreNextRegularLineNumber = false;

    // Decides if the content of inserted nodes should count as well. This is used so we can use the algorithm on a
    // text with inline diff annotations and get the same line numbering as with the original text (when set to false)
    private ignoreInsertedText = false;

    // var lineNumberCache = $cacheFactory('linenumbering.service');
    private lineNumberCache = {
        // @TODO
        get: (key: string) => undefined,
        put: (key: string, val: any) => undefined
    };

    /*
     * Only called by the tests, never from the actual app
     */
    public setInlineOffsetLineNumberForTests(offset: number, lineNumber: number): void {
        this.currentInlineOffset = offset;
        this.currentLineNumber = lineNumber;
    }

    public getInlineOffsetForTests(): number {
        return this.currentInlineOffset;
    }

    private isIgnoredByLineNumbering(node: Element): boolean {
        if (node.nodeName === 'INS') {
            return this.ignoreInsertedText;
        } else if (LinenumberingService.isOsLineNumberNode(node)) {
            return true;
        } else {
            return false;
        }
    }

    private createLineNumber(): Element {
        if (this.ignoreNextRegularLineNumber) {
            this.ignoreNextRegularLineNumber = false;
            return;
        }
        const node = document.createElement('span');
        const lineNumber = this.currentLineNumber;
        this.currentLineNumber++;
        node.setAttribute('class', 'os-line-number line-number-' + lineNumber);
        node.setAttribute('data-line-number', lineNumber + '');
        node.setAttribute('contenteditable', 'false');
        node.innerHTML = '&nbsp;'; // Prevent ckeditor from stripping out empty span's
        return node;
    }

    /**
     * Splits a TEXT_NODE into an array of TEXT_NODEs and BR-Elements separating them into lines.
     * Each line has a maximum length of 'length', with one exception: spaces are accepted to exceed the length.
     * Otherwise the string is split by the last space or dash in the line.
     *
     * @param node
     * @param length
     * @param highlight
     * @returns Array
     * @private
     */
    public textNodeToLines(node: Node, length: number, highlight = null) {
        const out = [];
        let currLineStart = 0,
            i = 0,
            firstTextNode = true;
        const addLine = (text: string) => {
            let lineNode;
            if (typeof highlight === 'undefined') {
                highlight = -1;
            }
            if (firstTextNode) {
                if (highlight === this.currentLineNumber - 1) {
                    lineNode = document.createElement('span');
                    lineNode.setAttribute('class', 'highlight');
                    lineNode.innerHTML = text;
                } else {
                    lineNode = document.createTextNode(text);
                }
                firstTextNode = false;
            } else {
                if (this.currentLineNumber === highlight && highlight !== null) {
                    lineNode = document.createElement('span');
                    lineNode.setAttribute('class', 'highlight');
                    lineNode.innerHTML = text;
                } else {
                    lineNode = document.createTextNode(text);
                }
                out.push(LinenumberingService.createLineBreak());
                if (this.currentLineNumber !== null) {
                    out.push(this.createLineNumber());
                }
            }
            out.push(lineNode);
            return lineNode;
        };
        const addLinebreakToPreviousNode = (lineNode: Element, offset: number) => {
            const firstText = lineNode.nodeValue.substr(0, offset + 1),
                secondText = lineNode.nodeValue.substr(offset + 1);
            const lineBreak = LinenumberingService.createLineBreak();
            const firstNode = document.createTextNode(firstText);
            lineNode.parentNode.insertBefore(firstNode, lineNode);
            lineNode.parentNode.insertBefore(lineBreak, lineNode);
            if (this.currentLineNumber !== null) {
                lineNode.parentNode.insertBefore(this.createLineNumber(), lineNode);
            }
            lineNode.nodeValue = secondText;
        };

        if (node.nodeValue === '\n') {
            out.push(node);
        } else {
            // This happens if a previous inline element exactly stretches to the end of the line
            if (this.currentInlineOffset >= length) {
                out.push(LinenumberingService.createLineBreak());
                if (this.currentLineNumber !== null) {
                    out.push(this.createLineNumber());
                }
                this.currentInlineOffset = 0;
                this.lastInlineBreakablePoint = null;
            } else if (this.prependLineNumberToFirstText) {
                if (this.ignoreNextRegularLineNumber) {
                    this.ignoreNextRegularLineNumber = false;
                } else if (this.currentLineNumber !== null) {
                    out.push(this.createLineNumber());
                }
            }
            this.prependLineNumberToFirstText = false;

            while (i < node.nodeValue.length) {
                let lineBreakAt = null;
                if (this.currentInlineOffset >= length) {
                    if (this.lastInlineBreakablePoint !== null) {
                        lineBreakAt = this.lastInlineBreakablePoint;
                    } else {
                        lineBreakAt = {
                            node: node,
                            offset: i - 1
                        };
                    }
                }
                if (lineBreakAt !== null && (node.nodeValue[i] !== ' ' && node.nodeValue[i] !== '\n')) {
                    if (lineBreakAt.node === node) {
                        // The last possible breaking point is in this text node
                        const currLine = node.nodeValue.substring(currLineStart, lineBreakAt.offset + 1);
                        addLine(currLine);

                        currLineStart = lineBreakAt.offset + 1;
                        this.currentInlineOffset = i - lineBreakAt.offset - 1;
                        this.lastInlineBreakablePoint = null;
                    } else {
                        // The last possible breaking point was not in this text not, but one we have already passed
                        const remainderOfPrev = lineBreakAt.node.nodeValue.length - lineBreakAt.offset - 1;
                        addLinebreakToPreviousNode(lineBreakAt.node, lineBreakAt.offset);

                        this.currentInlineOffset = i + remainderOfPrev;
                        this.lastInlineBreakablePoint = null;
                    }
                }

                if (node.nodeValue[i] === ' ' || node.nodeValue[i] === '-' || node.nodeValue[i] === '\n') {
                    this.lastInlineBreakablePoint = {
                        node: node,
                        offset: i
                    };
                }

                this.currentInlineOffset++;
                i++;
            }
            const lastLine = addLine(node.nodeValue.substring(currLineStart));
            if (this.lastInlineBreakablePoint !== null) {
                this.lastInlineBreakablePoint.node = lastLine;
            }
        }
        return out;
    }

    private lengthOfFirstInlineWord(node: Node): number {
        if (!node.firstChild) {
            return 0;
        }
        if (node.firstChild.nodeType === TEXT_NODE) {
            const parts = node.firstChild.nodeValue.split(' ');
            return parts[0].length;
        } else {
            return this.lengthOfFirstInlineWord(node.firstChild);
        }
    }

    private insertLineNumbersToInlineNode(node: Element, length: number, highlight): Element {
        const oldChildren: Node[] = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            oldChildren.push(node.childNodes[i]);
        }

        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }

        for (let i = 0; i < oldChildren.length; i++) {
            if (oldChildren[i].nodeType === TEXT_NODE) {
                const ret = this.textNodeToLines(oldChildren[i], length, highlight);
                for (let j = 0; j < ret.length; j++) {
                    node.appendChild(ret[j]);
                }
            } else if (oldChildren[i].nodeType === ELEMENT_NODE) {
                const childElement = <Element>oldChildren[i],
                    firstword = this.lengthOfFirstInlineWord(childElement),
                    overlength = this.currentInlineOffset + firstword > length && this.currentInlineOffset > 0;
                if (overlength && LinenumberingService.isInlineElement(childElement)) {
                    this.currentInlineOffset = 0;
                    this.lastInlineBreakablePoint = null;
                    node.appendChild(LinenumberingService.createLineBreak());
                    if (this.currentLineNumber !== null) {
                        node.appendChild(this.createLineNumber());
                    }
                }
                const changedNode = this.insertLineNumbersToNode(childElement, length, highlight);
                LinenumberingService.moveLeadingLineBreaksToOuterNode(changedNode, node);
                node.appendChild(changedNode);
            } else {
                throw new Error('Unknown nodeType: ' + i + ': ' + oldChildren[i]);
            }
        }

        return node;
    }

    public insertLineNumbersToBlockNode(node: Element, length: number, highlight) {
        this.currentInlineOffset = 0;
        this.lastInlineBreakablePoint = null;
        this.prependLineNumberToFirstText = true;

        const oldChildren = [];
        for (let i = 0; i < node.childNodes.length; i++) {
            oldChildren.push(node.childNodes[i]);
        }

        while (node.firstChild) {
            node.removeChild(node.firstChild);
        }

        for (let i = 0; i < oldChildren.length; i++) {
            if (oldChildren[i].nodeType === TEXT_NODE) {
                if (!oldChildren[i].nodeValue.match(/\S/)) {
                    // White space nodes between block elements should be ignored
                    const prevIsBlock = i > 0 && !LinenumberingService.isInlineElement(oldChildren[i - 1]);
                    const nextIsBlock =
                        i < oldChildren.length - 1 && !LinenumberingService.isInlineElement(oldChildren[i + 1]);
                    if (
                        (prevIsBlock && nextIsBlock) ||
                        (i === 0 && nextIsBlock) ||
                        (i === oldChildren.length - 1 && prevIsBlock)
                    ) {
                        node.appendChild(oldChildren[i]);
                        continue;
                    }
                }
                const ret = this.textNodeToLines(oldChildren[i], length, highlight);
                for (let j = 0; j < ret.length; j++) {
                    node.appendChild(ret[j]);
                }
            } else if (oldChildren[i].nodeType === ELEMENT_NODE) {
                const firstword = this.lengthOfFirstInlineWord(oldChildren[i]),
                    overlength = this.currentInlineOffset + firstword > length && this.currentInlineOffset > 0;
                if (
                    overlength &&
                    LinenumberingService.isInlineElement(oldChildren[i]) &&
                    !this.isIgnoredByLineNumbering(oldChildren[i])
                ) {
                    this.currentInlineOffset = 0;
                    this.lastInlineBreakablePoint = null;
                    node.appendChild(LinenumberingService.createLineBreak());
                    if (this.currentLineNumber !== null) {
                        node.appendChild(this.createLineNumber());
                    }
                }
                const changedNode = this.insertLineNumbersToNode(oldChildren[i], length, highlight);
                LinenumberingService.moveLeadingLineBreaksToOuterNode(changedNode, node);
                node.appendChild(changedNode);
            } else {
                throw new Error('Unknown nodeType: ' + i + ': ' + oldChildren[i]);
            }
        }

        this.currentInlineOffset = 0;
        this.lastInlineBreakablePoint = null;
        this.prependLineNumberToFirstText = true;
        this.ignoreNextRegularLineNumber = false;

        return node;
    }

    public insertLineNumbersToNode(node: Element, length: number, highlight): Element {
        if (node.nodeType !== ELEMENT_NODE) {
            throw new Error('This method may only be called for ELEMENT-nodes: ' + node.nodeValue);
        }
        if (this.isIgnoredByLineNumbering(node)) {
            if (this.currentInlineOffset === 0 && this.currentLineNumber !== null) {
                const lineNumberNode = this.createLineNumber();
                if (lineNumberNode) {
                    node.insertBefore(lineNumberNode, node.firstChild);
                    this.ignoreNextRegularLineNumber = true;
                }
            }
            return node;
        } else if (LinenumberingService.isInlineElement(node)) {
            return this.insertLineNumbersToInlineNode(node, length, highlight);
        } else {
            const newLength = LinenumberingService.calcBlockNodeLength(node, length);
            return this.insertLineNumbersToBlockNode(node, newLength, highlight);
        }
    }

    public stripLineNumbersFromNode(node: Node): void {
        for (let i = 0; i < node.childNodes.length; i++) {
            if (
                LinenumberingService.isOsLineBreakNode(node.childNodes[i]) ||
                LinenumberingService.isOsLineNumberNode(node.childNodes[i])
            ) {
                // If a newline character follows a line break, it's been very likely inserted by the WYSIWYG-editor
                if (node.childNodes.length > i + 1 && node.childNodes[i + 1].nodeType === TEXT_NODE) {
                    if (node.childNodes[i + 1].nodeValue[0] === '\n') {
                        node.childNodes[i + 1].nodeValue = ' ' + node.childNodes[i + 1].nodeValue.substring(1);
                    }
                }
                node.removeChild(node.childNodes[i]);
                i--;
            } else {
                this.stripLineNumbersFromNode(node.childNodes[i]);
            }
        }
    }

    /**
     *
     * @param {string} html
     * @param {number|string} lineLength
     * @param {number|null} highlight - optional
     * @param {number|null} firstLine
     */
    public insertLineNumbersNode(html: string, lineLength: number, highlight, firstLine): Element {
        // Removing newlines after BRs, as they lead to problems like #3410
        if (html) {
            html = html.replace(/(<br[^>]*>)[\n\r]+/gi, '$1');
        }

        const root = document.createElement('div');
        root.innerHTML = html;

        this.currentInlineOffset = 0;
        this.lastInlineBreakablePoint = null;
        if (firstLine) {
            this.currentLineNumber = parseInt(firstLine, 10);
        } else {
            this.currentLineNumber = 1;
        }
        if (highlight !== null) {
            highlight = parseInt(highlight, 10);
        }
        this.prependLineNumberToFirstText = true;
        this.ignoreNextRegularLineNumber = false;
        this.ignoreInsertedText = true;

        return this.insertLineNumbersToNode(root, lineLength, highlight);
    }

    /**
     *
     * @param {string} html
     * @param {number} lineLength
     * @param {number|null} highlight - optional
     * @param {function} callback
     * @param {number} firstLine
     * @returns {string}
     */
    public insertLineNumbers(html: string, lineLength: number, highlight = null, callback = null, firstLine = null) {
        let newHtml, newRoot;

        if (highlight > 0) {
            // Caching versions with highlighted line numbers is probably not worth it
            newRoot = this.insertLineNumbersNode(html, lineLength, highlight, firstLine);
            newHtml = newRoot.innerHTML;
        } else {
            const firstLineStr = firstLine === null || firstLine === null ? '' : firstLine.toString();
            const cacheKey = LinenumberingService.djb2hash(firstLineStr + '-' + lineLength.toString() + html);
            newHtml = this.lineNumberCache.get(cacheKey);

            if (!newHtml) {
                newRoot = this.insertLineNumbersNode(html, lineLength, null, firstLine);
                newHtml = newRoot.innerHTML;
                this.lineNumberCache.put(cacheKey, newHtml);
            }
        }

        if (callback) {
            callback();
        }

        return newHtml;
    }

    /**
     * @param {string} html
     * @param {number} lineLength
     * @param {boolean} countInserted
     */
    public insertLineBreaksWithoutNumbers(html: string, lineLength: number, countInserted: boolean = false): string {
        const root = document.createElement('div');
        root.innerHTML = html;

        this.currentInlineOffset = 0;
        this.lastInlineBreakablePoint = null;
        this.currentLineNumber = null;
        this.prependLineNumberToFirstText = true;
        this.ignoreNextRegularLineNumber = false;
        this.ignoreInsertedText = !countInserted;

        const newRoot = this.insertLineNumbersToNode(root, lineLength, null);

        return newRoot.innerHTML;
    }

    /**
     * @param {string} html
     * @returns {string}
     */
    public stripLineNumbers(html: string): string {
        const root = document.createElement('div');
        root.innerHTML = html;
        this.stripLineNumbersFromNode(root);
        return root.innerHTML;
    }

    /**
     * Traverses up the DOM tree until it finds a node with a nextSibling, then returns that sibling
     *
     * @param node
     * @private
     */
    public findNextAuntNode(node: Node): Node {
        if (node.nextSibling) {
            return node.nextSibling;
        } else if (node.parentNode) {
            return this.findNextAuntNode(node.parentNode);
        } else {
            return null;
        }
    }

    public highlightUntilNextLine(lineNumberNode: Element): void {
        let currentNode: Node = lineNumberNode,
            foundNextLineNumber = false;

        do {
            let wasHighlighted = false;
            if (currentNode.nodeType === TEXT_NODE) {
                const node = document.createElement('span');
                node.setAttribute('class', 'highlight');
                node.innerHTML = currentNode.nodeValue;
                currentNode.parentNode.insertBefore(node, currentNode);
                currentNode.parentNode.removeChild(currentNode);
                currentNode = node;
                wasHighlighted = true;
            } else {
                wasHighlighted = false;
            }

            if (
                currentNode.childNodes.length > 0 &&
                !LinenumberingService.isOsLineNumberNode(currentNode) &&
                !wasHighlighted
            ) {
                currentNode = currentNode.childNodes[0];
            } else if (currentNode.nextSibling) {
                currentNode = currentNode.nextSibling;
            } else {
                currentNode = this.findNextAuntNode(currentNode);
            }

            if (LinenumberingService.isOsLineNumberNode(currentNode)) {
                foundNextLineNumber = true;
            }
        } while (!foundNextLineNumber && currentNode !== null);
    }

    /**
     * @param {string} html
     * @param {number} lineNumber
     * @return {string}
     */
    public highlightLine(html: string, lineNumber: number): string {
        const fragment = LinenumberingService.htmlToFragment(html),
            lineNumberNode = LinenumberingService.getLineNumberNode(fragment, lineNumber);

        if (lineNumberNode) {
            this.highlightUntilNextLine(lineNumberNode);
            html = LinenumberingService.fragmentToHtml(fragment);
        }

        return html;
    }
}
