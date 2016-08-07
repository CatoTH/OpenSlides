describe('linenumbering', function () {

  beforeEach(module('OpenSlidesApp.motions.diff'));

  var diffService,
      brMarkup = function (no) {
        return '<br class="os-line-break">' +
            '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      },
      noMarkup = function (no) {
        return '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      };

  beforeEach(inject(function (_diffService_) {
    diffService = _diffService_;
  }));

  describe('extraction of lines', function () {
    var baseHtmlDom = document.createDocumentFragment(),
        holderDiv = document.createElement('div');

    baseHtmlDom.appendChild(holderDiv);
    holderDiv.innerHTML = '<div>' +
          noMarkup(1) + 'Line 1' + brMarkup(2) + 'Line 2' +
          brMarkup(3) + 'Line <strong>3' + brMarkup(4) + 'Line 4' + brMarkup(5) + 'Line</strong> 5' +
          '<ul class="ul-class">' +
            '<li class="li-class">' + noMarkup(6) + 'Line 6 ' + brMarkup(7) + 'Line 7' + '</li>' +
            '<li class="li-class"><ul>' +
              '<li>' + noMarkup(8) + 'Level 2 LI 8</li>' +
              '<li>' + noMarkup(9) + 'Level 2 LI 9</li>' +
            '</ul></li>' +
          '</ul>' +
          noMarkup(10) + 'Line 10' + brMarkup(11) + 'Line 11</div>';

    it('locates line number nodes', function() {
      var lineNumberNode = diffService.getLineNumberNode(baseHtmlDom, 4);
      expect(lineNumberNode.parentNode.nodeName).toBe('STRONG');

      lineNumberNode = diffService.getLineNumberNode(baseHtmlDom, 9);
      expect(lineNumberNode.parentNode.nodeName).toBe('LI');

      lineNumberNode = diffService.getLineNumberNode(baseHtmlDom, 15);
      expect(lineNumberNode).toBe(null);
    });

    it('finds the common ancestor', function() {
      var fromLineNode, toLineNode, commonAncestor;

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom, 7);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("LI");

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom, 8);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("UL");

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom, 10);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("DIV");

    });

    it('renders DOMs correctly', function() {
      var lineNo = diffService.getLineNumberNode(baseHtmlDom, 7),
          greatParent = lineNo.parentNode.parentNode,
          lineTrace = [lineNo.parentNode, lineNo];

      var pre = diffService._serializePartialDomToChild(greatParent, lineTrace);
      expect(pre).toBe('<UL><LI>Line 6 ');

      lineTrace = [lineNo.parentNode, lineNo];
      var post = diffService._serializePartialDomFromChild(greatParent, lineTrace);
      expect(post).toBe('Line 7' + '</LI>' +
            '<LI class="li-class"><UL>' +
              '<LI>Level 2 LI 8</LI>' +
              '<LI>Level 2 LI 9</LI>' +
            '</UL></LI>' +
          '</UL>');
    });
    /*
    it('extracts a single line', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom, 1, 2);
      expect(diff).toBe('Test1');
    });
    */
  });
});
