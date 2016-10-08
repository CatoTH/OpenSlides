describe('linenumbering', function () {

  beforeEach(module('OpenSlidesApp.motions.diff'));

  var diffService, baseHtmlDom1, baseHtmlDom2, baseHtmlDom3,
      brMarkup = function (no) {
        return '<br class="os-line-break">' +
            '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      },
      noMarkup = function (no) {
        return '<span class="os-line-number line-number-' + no + '" data-line-number="' + no + '" contenteditable="false">&nbsp;</span>';
      };

  beforeEach(inject(function (_diffService_) {
    diffService = _diffService_;

    baseHtmlDom1 = diffService.htmlToFragment('<p>' +
          noMarkup(1) + 'Line 1 ' + brMarkup(2) + 'Line 2 ' +
          brMarkup(3) + 'Line <strong>3<br>' + noMarkup(4) + 'Line 4 ' + brMarkup(5) + 'Line</strong> 5</p>' +
          '<ul class="ul-class">' +
            '<li class="li-class">' + noMarkup(6) + 'Line 6 ' + brMarkup(7) + 'Line 7' + '</li>' +
            '<li class="li-class"><ul>' +
              '<li>' + noMarkup(8) + 'Level 2 LI 8</li>' +
              '<li>' + noMarkup(9) + 'Level 2 LI 9</li>' +
            '</ul></li>' +
          '</ul>' +
          '<p>' + noMarkup(10) + 'Line 10 ' + brMarkup(11) + 'Line 11</p>');

    baseHtmlDom2 = diffService.htmlToFragment('<p>' + noMarkup(1) + 'Single text line</p>\
<p>' + noMarkup(2) + 'sdfsdfsdfsdf dsfsdfsdfdsflkewjrl ksjfl ksdjf&nbsp;klnlkjBavaria ipsum dolor sit amet Biazelt Auffisteign ' + brMarkup(3) + 'Schorsch mim Radl foahn Ohrwaschl Steckerleis wann griagd ma nacha wos z’dringa glacht Mamalad, ' +
        brMarkup(4) + 'muass? I bin a woschechta Bayer sowos oamoi und sei und glei wirds no fui lustiga: Jo mei khkhis des ' + brMarkup(5) + 'schee middn ognudelt, Trachtnhuat Biawambn gscheid: Griasd eich midnand etza nix Gwiass woass ma ned ' +
        brMarkup(6) + 'owe. Dahoam gscheckate middn Spuiratz des is a gmahde Wiesn. Des is schee so Obazda san da, Haferl ' + brMarkup(7) + 'pfenningguat schoo griasd eich midnand.</p>\
<ul>\
<li>' + noMarkup(8) + 'Auffi Gamsbart nimma de Sepp Ledahosn Ohrwaschl um Godds wujn Wiesn Deandlgwand Mongdratzal! Jo ' + brMarkup(9) + 'leck mi Mamalad i daad mechad?</li>\
<li>' + noMarkup(10) + 'Do nackata Wurscht i hob di narrisch gean, Diandldrahn Deandlgwand vui huift vui woaß?</li>\
<li>' + noMarkup(11) + 'Ned Mamalad auffi i bin a woschechta Bayer greaßt eich nachad, umananda gwiss nia need ' + brMarkup(12) + 'Weiznglasl.</li>\
<li>' + noMarkup(13) + 'Woibbadinga noch da Giasinga Heiwog Biazelt mechad mim Spuiratz, soi zwoa.</li>\
</ul>\
<p>' + noMarkup(14) + 'I waar soweid Blosmusi es nomoi. Broadwurschtbudn des is a gmahde Wiesn Kirwa mogsd a Bussal ' + brMarkup(15) + 'Guglhupf schüds nei. Luja i moan oiwei Baamwach Watschnbaam, wiavui baddscher! Biakriagal a fescha ' +
        brMarkup(16) + '1Bua Semmlkneedl iabaroi oba um Godds wujn Ledahosn wui Greichats. Geh um Godds wujn luja heid ' + brMarkup(17) + 'greaßt eich nachad woaß Breihaus eam! De om auf’n Gipfe auf gehds beim Schichtl mehra Baamwach a ' + brMarkup(18) + 'bissal wos gehd ollaweil gscheid:</p>\
<blockquote>\
<p>' + noMarkup(19) + 'Scheans Schdarmbeaga See i hob di narrisch gean i jo mei is des schee! Nia eam ' + brMarkup(20) + 'hod vasteh i sog ja nix, i red ja bloß sammawiedaguad, umma eana obandeln! Zwoa ' + brMarkup(21) + 'jo mei scheans amoi, san und hoggd Milli barfuaßat gscheit. Foidweg vui huift ' +
    brMarkup(22) + 'vui singan, mehra Biakriagal om auf’n Gipfe! Ozapfa sodala Charivari greaßt eich ' + brMarkup(23) + 'nachad Broadwurschtbudn do middn liberalitas Bavariae sowos Leonhardifahrt:</p>\
</blockquote>\
<p>' + noMarkup(24) + 'Wui helfgod Wiesn, ognudelt schaugn: Dahoam gelbe Rüam Schneid singan wo hi sauba i moan scho aa no ' + brMarkup(25) + 'a Maß a Maß und no a Maß nimma. Is umananda a ganze Hoiwe zwoa, Schneid. Vui huift vui Brodzeid kumm ' +
        brMarkup(26) + 'geh naa i daad vo de allerweil, gor. Woaß wia Gams, damischa. A ganze Hoiwe Ohrwaschl Greichats ' + brMarkup(27) + 'iabaroi Prosd Engelgwand nix Reiwadatschi.Weibaleid ognudelt Ledahosn noch da Giasinga Heiwog i daad ' +
        brMarkup(28) + 'Almrausch, Ewig und drei Dog nackata wea ko, dea ko. Meidromml Graudwiggal nois dei, nackata. No ' + brMarkup(29) + 'Diandldrahn nix Gwiass woass ma ned hod boarischer: Samma sammawiedaguad wos, i hoam Brodzeid. Jo ' +
        brMarkup(30) + 'mei Sepp Gaudi, is ma Wuascht do Hendl Xaver Prosd eana an a bravs. Sauwedda an Brezn, abfieseln.</p>');

    baseHtmlDom3 = diffService.htmlToFragment('<ol>' +
        '<li>' + noMarkup(1) + 'Line 1</li>' +
        '<li>' + noMarkup(2) + 'Line 2</li>' +
        '<li><ol>' +
            '<li>' + noMarkup(3) + 'Line 3.1</li>' +
            '<li>' + noMarkup(4) + 'Line 3.2</li>' +
            '<li>' + noMarkup(5) + 'Line 3.3</li>' +
        '</ol></li>' +
        '<li>' + noMarkup(6) + ' Line 4</li></ol>');

    diffService._insertInternalLineMarkers(baseHtmlDom1);
    diffService._insertInternalLineMarkers(baseHtmlDom2);
  }));


  describe('extraction of lines', function () {
    it('locates line number nodes', function() {
      var lineNumberNode = diffService.getLineNumberNode(baseHtmlDom1, 4);
      expect(lineNumberNode.parentNode.nodeName).toBe('STRONG');

      lineNumberNode = diffService.getLineNumberNode(baseHtmlDom1, 9);
      expect(lineNumberNode.parentNode.nodeName).toBe('UL');

      lineNumberNode = diffService.getLineNumberNode(baseHtmlDom1, 15);
      expect(lineNumberNode).toBe(null);
    });

    it('finds the common ancestor', function() {
      var fromLineNode, toLineNode, commonAncestor;

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom1, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom1, 7);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("#document-fragment");

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom1, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom1, 8);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("#document-fragment");

      fromLineNode = diffService.getLineNumberNode(baseHtmlDom1, 6);
      toLineNode = diffService.getLineNumberNode(baseHtmlDom1, 10);
      commonAncestor = diffService._getCommonAncestor(fromLineNode, toLineNode);
      expect(commonAncestor.commonAncestor.nodeName).toBe("#document-fragment");

    });

    it('renders DOMs correctly (1)', function() {
      var lineNo = diffService.getLineNumberNode(baseHtmlDom1, 7),
          greatParent = lineNo.parentNode.parentNode,
          lineTrace = [lineNo.parentNode, lineNo];

      var pre = diffService._serializePartialDomToChild(greatParent, lineTrace, true);
      expect(pre).toBe('<UL class="ul-class"><LI class="li-class">Line 6 ');

      lineTrace = [lineNo.parentNode, lineNo];
      var post = diffService._serializePartialDomFromChild(greatParent, lineTrace, true);
      expect(post).toBe('Line 7' + '</LI>' +
            '<LI class="li-class"><UL>' +
              '<LI>Level 2 LI 8</LI>' +
              '<LI>Level 2 LI 9</LI>' +
            '</UL></LI>' +
          '</UL>');
    });

    it('renders DOMs correctly (2)', function() {
      var lineNo = diffService.getLineNumberNode(baseHtmlDom1, 9),
          greatParent = lineNo.parentNode.parentNode,
          lineTrace = [lineNo.parentNode, lineNo];

      var pre = diffService._serializePartialDomToChild(greatParent, lineTrace, true);
      expect(pre).toBe('<LI class="li-class"><UL><LI>Level 2 LI 8</LI>');
    });

    it('extracts a single line', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom1, 1, 2);
      expect(diff.html).toBe('<P>Line 1 ');
      expect(diff.outerContextStart).toBe('');
      expect(diff.outerContextEnd).toBe('');
    });

    it('extracts lines from nested UL/LI-structures', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom1, 7, 9);
      expect(diff.html).toBe('Line 7</LI><LI class="li-class"><UL><LI>Level 2 LI 8</LI>');
      expect(diff.ancestor.nodeName).toBe('UL');
      expect(diff.outerContextStart).toBe('<UL class="ul-class">');
      expect(diff.outerContextEnd).toBe('</UL>');
      expect(diff.innerContextStart).toBe('<LI class="li-class">');
      expect(diff.innerContextEnd).toBe('</UL></LI>');
      expect(diff.previousHtmlEndSnippet).toBe('</LI></UL>');
      expect(diff.followingHtmlStartSnippet).toBe('<UL class="ul-class"><LI class="li-class"><UL>');
    });

    it('extracts lines from a more complex example', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom2, 6, 11);

      expect(diff.html).toBe('owe. Dahoam gscheckate middn Spuiratz des is a gmahde Wiesn. Des is schee so Obazda san da, Haferl pfenningguat schoo griasd eich midnand.</P><UL><LI>Auffi Gamsbart nimma de Sepp Ledahosn Ohrwaschl um Godds wujn Wiesn Deandlgwand Mongdratzal! Jo leck mi Mamalad i daad mechad?</LI><LI>Do nackata Wurscht i hob di narrisch gean, Diandldrahn Deandlgwand vui huift vui woaß?</LI>');
      expect(diff.ancestor.nodeName).toBe('#document-fragment');
      expect(diff.outerContextStart).toBe('');
      expect(diff.outerContextEnd).toBe('');
      expect(diff.innerContextStart).toBe('<P>');
      expect(diff.innerContextEnd).toBe('</UL>');
      expect(diff.previousHtmlEndSnippet).toBe('</P>');
      expect(diff.followingHtmlStartSnippet).toBe('<UL>');
    });

    it('extracts the end of a section', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom2, 29, null);

      expect(diff.html).toBe('Diandldrahn nix Gwiass woass ma ned hod boarischer: Samma sammawiedaguad wos, i hoam Brodzeid. Jo mei Sepp Gaudi, is ma Wuascht do Hendl Xaver Prosd eana an a bravs. Sauwedda an Brezn, abfieseln.</P>');
      expect(diff.ancestor.nodeName).toBe('#document-fragment');
      expect(diff.outerContextStart).toBe('');
      expect(diff.outerContextEnd).toBe('');
      expect(diff.innerContextStart).toBe('<P>');
      expect(diff.innerContextEnd).toBe('');
      expect(diff.previousHtmlEndSnippet).toBe('</P>');
      expect(diff.followingHtml).toBe('');
      expect(diff.followingHtmlStartSnippet).toBe('');
    });

    it('preserves the numbering of OLs (1)', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom3, 5, 7, true);

      expect(diff.html).toBe('<LI>Line 3.3</LI></OL></LI><LI> Line 4</LI></OL>');
      expect(diff.ancestor.nodeName).toBe('#document-fragment');
      expect(diff.innerContextStart).toBe('<OL start="3"><LI><OL start="3">');
      expect(diff.innerContextEnd).toBe('');
      expect(diff.previousHtmlEndSnippet).toBe('</OL></LI></OL>');
    });

    it('preserves the numbering of OLs (2)', function () {
      var diff = diffService.extractRangeByLineNumbers(baseHtmlDom3, 3, 5, true);

      expect(diff.html).toBe('<LI><OL><LI>Line 3.1</LI><LI>Line 3.2</LI>');
      expect(diff.ancestor.nodeName).toBe('OL');
      expect(diff.outerContextStart).toBe('<OL start="3">');
      expect(diff.outerContextEnd).toBe('</OL>');
    });
  });

  describe('merging two sections', function () {
      it('merges OLs recursively, ignoring whitespaces between OL and LI', function () {
          var node1 = document.createElement('DIV');
          node1.innerHTML = '<OL><LI><OL><LI>Punkt 4.1</LI><TEMPLATE></TEMPLATE></OL></LI> </OL>';
          var node2 = document.createElement('DIV');
          node2.innerHTML = '<OL> <LI>\
<OL start="2">\
 <LI>Punkt 4.2</LI>\
<LI>Punkt 4.3</LI>\
</OL></LI></OL>';
          var out = diffService._replaceLinesMergeNodeArrays([node1.childNodes[0]], [node2.childNodes[0]]);
          expect(out[0], '<ol><li><ol><li>Punkt 4.1</li><template></template><li>Punkt 4.2</li><li>Punkt 4.3</li></ol></li></ol>');
      });
  });

  describe('replacing lines in the original motion', function () {

    it('replaces LIs by a P', function () {
      var merged = diffService.replaceLines(baseHtmlDom1, '<p>Replaced a UL by a P</p>', 6, 9);
      expect(merged).toBe('<P>Line 1 Line 2 Line <STRONG>3<BR>Line 4 Line</STRONG> 5</P><P>Replaced a UL by a P</P><UL class="ul-class"><LI class="li-class"><UL><LI>Level 2 LI 9</LI></UL></LI></UL><P>Line 10 Line 11</P>');
    });

    it('replaces LIs by another LI', function () {
      var merged = diffService.replaceLines(baseHtmlDom1, '<UL class="ul-class"><LI>A new LI</LI></UL>', 6, 9);
      expect(merged).toBe('<P>Line 1 Line 2 Line <STRONG>3<BR>Line 4 Line</STRONG> 5</P><UL class="ul-class"><LI>A new LI<UL><LI>Level 2 LI 9</LI></UL></LI></UL><P>Line 10 Line 11</P>');
    });

    it('breaks up a paragraph into two', function() {
      var merged = diffService.replaceLines(baseHtmlDom1, '<P>Replaced Line 10</P><P>Inserted Line 11 </P>', 10, 11);
      expect(merged).toBe('<P>Line 1 Line 2 Line <STRONG>3<BR>Line 4 Line</STRONG> 5</P><UL class="ul-class"><LI class="li-class">Line 6 Line 7</LI><LI class="li-class"><UL><LI>Level 2 LI 8</LI><LI>Level 2 LI 9</LI></UL></LI></UL><P>Replaced Line 10</P><P>Inserted Line 11 Line 11</P>');
    });

  });
});
