describe('linenumbering', function () {

  beforeEach(module('OpenSlidesApp.motions.lineNumbering'));

  var lineNumberingService,
      brMarkup = function(no) {
        return '<br class="os-line-break">' +
            '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '"></span>';
      };

  beforeEach(inject(function(_lineNumberingService_){
    lineNumberingService = _lineNumberingService_;
  }));

  describe('line numbering: test nodes', function () {
    it('breaks very short lines', function () {
      var textNode = document.createTextNode("0123");
      lineNumberingService._currentInlineOffset = 0;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('0123');
      expect(lineNumberingService._currentInlineOffset).toBe(4);
    });

    it('breaks simple lines', function () {
      var textNode = document.createTextNode("012345678901234567");
      lineNumberingService._currentInlineOffset = 0;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('01234' + brMarkup(1) + '56789' + brMarkup(2) + '01234' + brMarkup(3) + '567');
      expect(lineNumberingService._currentInlineOffset).toBe(3);
    });

    it('breaks simple lines with offset', function () {
      var textNode = document.createTextNode("012345678901234567");
      lineNumberingService._currentInlineOffset = 2;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('012' + brMarkup(1) + '34567' + brMarkup(2) + '89012' + brMarkup(3) + '34567');
      expect(lineNumberingService._currentInlineOffset).toBe(5);
    });

    it('breaks simple lines with offset equaling to length', function () {
      var textNode = document.createTextNode("012345678901234567");
      lineNumberingService._currentInlineOffset = 5;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe(brMarkup(1) + '01234' + brMarkup(2) + '56789' + brMarkup(3) + '01234' + brMarkup(4) + '567');
      expect(lineNumberingService._currentInlineOffset).toBe(3);
    });

    it('breaks simple lines with spaces (1)', function () {
      var textNode = document.createTextNode("0123 45 67 89012 34 567");
      lineNumberingService._currentInlineOffset = 0;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('0123 ' + brMarkup(1) + '45 67 ' + brMarkup(2) + '89012 ' + brMarkup(3) + '34 ' + brMarkup(4) + '567');
      expect(lineNumberingService._currentInlineOffset).toBe(3);
    });

    it('breaks simple lines with spaces (2)', function () {
      var textNode = document.createTextNode("0123 45 67 89012tes 344 ");
      lineNumberingService._currentInlineOffset = 0;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('0123 ' + brMarkup(1) + '45 67 ' + brMarkup(2) + '89012' + brMarkup(3) + 'tes ' + brMarkup(4) + '344 ');
      expect(lineNumberingService._currentInlineOffset).toBe(4);
    });

    it('breaks simple lines with spaces (3)', function () {
      var textNode = document.createTextNode("I'm a Demo-Text");
      lineNumberingService._currentInlineOffset = 0;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('I\'m a ' + brMarkup(1) + 'Demo-' + brMarkup(2) + 'Text');
      expect(lineNumberingService._currentInlineOffset).toBe(4);
    });

    it('breaks simple lines with spaces (4)', function () {
      var textNode = document.createTextNode("I'm a LongDemo-Text");
      lineNumberingService._currentInlineOffset = 0;
      lineNumberingService._currentLineNumber = 1;
      var out = lineNumberingService._textNodeToLines(textNode, 5);
      var outHtml = lineNumberingService._nodesToHtml(out);
      expect(outHtml).toBe('I\'m a ' + brMarkup(1) + 'LongD' + brMarkup(2) + 'emo-' + brMarkup(3) + 'Text');
      expect(lineNumberingService._currentInlineOffset).toBe(4);
    });
  });


  describe('line numbering: inline nodes', function () {
    it('leaves a simple SPAN untouched', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<span>Test</span>");
      expect(outHtml).toBe('<span>Test</span>');
    });

    it('breaks lines in a simple SPAN', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<span>Lorem ipsum dolorsit amet</span>");
      expect(outHtml).toBe('<span>Lorem ' + brMarkup(1) + 'ipsum ' + brMarkup(2) + 'dolor' + brMarkup(3) + 'sit ' + brMarkup(4) + 'amet</span>');
    });

    it('breaks lines in nested inline elements', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<span>Lorem <strong>ipsum dolorsit</strong> amet</span>");
      expect(outHtml).toBe('<span>Lorem ' + brMarkup(1) + '<strong>ipsum ' + brMarkup(2) + 'dolor' + brMarkup(3) + 'sit</strong> ' + brMarkup(4) + 'amet</span>');
    });
  });


  describe('line numbering: block nodes', function () {
    it('leaves a simple DIV untouched', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<div>Test</div>");
      expect(outHtml).toBe('<div>Test</div>');
    });

    it('breaks a DIV containing only inline elements', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<div>Test <span>Test1234</span>5678 Test</div>");
      expect(outHtml).toBe('<div>Test ' + brMarkup(1) + '<span>Test1' + brMarkup(2) + '234</span>56' + brMarkup(3) + '78 ' + brMarkup(4) + 'Test</div>');
    });

    it('handles a DIV within a DIV correctly', function() {
      lineNumberingService.setLineLength(5);
      var outHtml = lineNumberingService.insertLineNumbers("<div>Te<div>Te Test</div>Test");
      expect(outHtml).toBe('<div>Te<div>Te ' + brMarkup(1) + 'Test</div>Test</div>');
    });
  });
});
