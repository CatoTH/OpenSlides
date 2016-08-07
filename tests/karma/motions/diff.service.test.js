describe('linenumbering', function () {

  beforeEach(module('OpenSlidesApp.motions.diff'));

  var lineNumberingService,
      brMarkup = function (no) {
        return '<br class="os-line-break">' +
            '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      },
      noMarkup = function (no) {
        return '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      };

  beforeEach(inject(function (_lineNumberingService_) {
    lineNumberingService = _lineNumberingService_;
  }));

  describe('extraction of lines', function () {
    var baseHtmlDom = document.createDocumentFragment(),
        holderDiv = document.createElement('div');

    baseHtmlDom.appendChild(holderDiv);
    holderDiv.innerHTML = '<div>' +
          noMarkup(1) + 'Line 1' + brMarkup(2) + 'Line 2' +
          brMarkup(3) + 'Line <strong>3' + brMarkup(4) + 'Line 4' + brMarkup(5) + 'Line</strong> 5' +
          '<ul>' +
            '<li>' + noMarkup(6) + 'Line 6' + brMarkup(7) + 'Line 7' + '</li>' +
            '<li><ul>' +
              '<li>' + noMarkup(8) + 'Level 2 LI 8</li>' +
              '<li>' + noMarkup(9) + 'Level 2 LI 9</li>' +
            '</ul></li>' +
          '</ul>' +
          noMarkup(10) + 'Line 10' + brMarkup(11) + 'Line 11</div>';

    it('locates line number nodes', function() {
      var lineNumberNode = lineNumberingService.getLineNumberNode(baseHtmlDom, 4);
      expect(lineNumberNode.parentNode.nodeName).toBe('STRONG');

      lineNumberNode = lineNumberingService.getLineNumberNode(baseHtmlDom, 9);
      expect(lineNumberNode.parentNode.nodeName).toBe('LI');

      lineNumberNode = lineNumberingService.getLineNumberNode(baseHtmlDom, 15);
      expect(lineNumberNode).toBe(null);
    });

    it('extracts a single line', function () {

    });
  });
});
