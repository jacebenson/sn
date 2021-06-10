---
title: "DiffView"
id: "diffview"
---

API Name: global.DiffView

```js
var DiffView = Class.create();
/***
 This is part of jsdifflib v1.0. <http://snowtide.com/jsdifflib>
 Copyright (c) 2007, Snowtide Informatics Systems, Inc.
 All rights reserved.
 Redistribution and use in source and binary forms, with or without modification,
 are permitted provided that the following conditions are met:
 * Redistributions of source code must retain the above copyright notice, this
 list of conditions and the following disclaimer.
 * Redistributions in binary form must reproduce the above copyright notice,
 this list of conditions and the following disclaimer in the documentation
 and/or other materials provided with the distribution.
 * Neither the name of the Snowtide Informatics Systems nor the names of its
 contributors may be used to endorse or promote products derived from this
 software without specific prior written permission.
 THIS SOFTWARE IS PROVIDED BY THE COPYRIGHT HOLDERS AND CONTRIBUTORS "AS IS" AND ANY
 EXPRESS OR IMPLIED WARRANTIES, INCLUDING, BUT NOT LIMITED TO, THE IMPLIED WARRANTIES
 OF MERCHANTABILITY AND FITNESS FOR A PARTICULAR PURPOSE ARE DISCLAIMED. IN NO EVENT
 SHALL THE COPYRIGHT OWNER OR CONTRIBUTORS BE LIABLE FOR ANY DIRECT, INDIRECT,
 INCIDENTAL, SPECIAL, EXEMPLARY, OR CONSEQUENTIAL DAMAGES (INCLUDING, BUT NOT LIMITED
 TO, PROCUREMENT OF SUBSTITUTE GOODS OR SERVICES; LOSS OF USE, DATA, OR PROFITS; OR
 BUSINESS INTERRUPTION) HOWEVER CAUSED AND ON ANY THEORY OF LIABILITY, WHETHER IN
 CONTRACT, STRICT LIABILITY, OR TORT (INCLUDING NEGLIGENCE OR OTHERWISE) ARISING IN
 ANY WAY OUT OF THE USE OF THIS SOFTWARE, EVEN IF ADVISED OF THE POSSIBILITY OF SUCH
 DAMAGE.
 ***/
/* Author: Chas Emerick <cemerick@snowtide.com> */
DiffView.prototype = {
    /**
     * Builds and returns a visual diff view.  The single parameter, `params', should contain
     * the following values:
     *
     * - baseTextLines: the array of strings that was used as the base text input to SequenceMatcher
     * - newTextLines: the array of strings that was used as the new text input to SequenceMatcher
     * - opcodes: the array of arrays returned by SequenceMatcher.get_opcodes()
     * - baseTextName: the title to be displayed above the base text listing in the diff view; defaults
     *	   to "Base Text"
     * - newTextName: the title to be displayed above the new text listing in the diff view; defaults
     *	   to "New Text"
     * - contextSize: the number of lines of context to show around differences; by default, all lines
     *	   are shown
     * - viewType: if 0, a side-by-side diff view is generated (default); if 1, an inline diff view is
     *	   generated
     */
    buildView: function(params){
        var baseTextLines = params.baseTextLines;
        var newTextLines = params.newTextLines;
        var opcodes = params.opcodes;
        var baseTextName = params.baseTextName ? params.baseTextName : "Base Text";
        var newTextName = params.newTextName ? params.newTextName : "New Text";
        var contextSize = params.contextSize;
        var fieldAtTop = false;
        var element = params.element;
        var inline = (params.viewType == 0 || params.viewType == 1) ? params.viewType : 0;
        var document = GlideXMLUtil.newDocument();
        
        if (baseTextLines == null) 
            throw "Cannot build diff view; baseTextLines is not defined.";
        if (newTextLines == null) 
            throw "Cannot build diff view; newTextLines is not defined.";
        if (!opcodes) 
            throw "Canno build diff view; opcodes is not defined.";
        
        function celt(name, clazz){
            var e = document.createElement(name);
            e.setAttribute("class", clazz);
            ;
            return e;
        }
        
        function telt(name, text){
            var e = document.createElement(name);
            e.appendChild(document.createTextNode(text));
            return e;
        }
        
        function ctelt(name, clazz, text){
            if (text.replaceAll(" ", "") == "") 
                text = " ";
            var e = document.createElement(name);
            e.setAttribute("class", clazz);
            e.appendChild(document.createTextNode(text));
            return e;
        }
        
        var tdata = document.createElement("thead");
        var node = document.createElement("tr");
        tdata.appendChild(node);
        if (inline) {
            node.appendChild(document.createElement("th"));
            node.appendChild(document.createElement("th"));
            node.appendChild(ctelt("th", "texttitle", baseTextName + " vs. " + newTextName));
        }
        else {
            //	node.appendChild(document.createElement("th"));
            //	node.appendChild(ctelt("th", "texttitle", baseTextName));
            //	node.appendChild(document.createElement("th"));
            //	node.appendChild(ctelt("th", "texttitle", newTextName));
        }
        tdata = [tdata];
        
        var rows = [];
        var node2;
        
        /**
         * Adds two cells to the given row; if the given row corresponds to a real
         * line number (based on the line index tidx and the endpoint of the
         * range in question tend), then the cells will contain the line number
         * and the line of text from textLines at position tidx (with the class of
         * the second cell set to the name of the change represented), and tidx + 1 will
         * be returned.	 Otherwise, tidx is returned, and two empty cells are added
         * to the given row.
         */
        function addCells(row, tidx, tend, textLines, change, side){
            if (tidx < tend) {
                if (tidx == 0 && side && !fieldAtTop) {
                    var item = ctelt("th", "field", element);
                    row.appendChild(item);
                }
                else 
                    if (side) 
                        row.appendChild(ctelt("th", "field", ""));
                if (newTextLines.length > 1 || baseTextLines.length > 1) 
                    row.appendChild(ctelt("td", "count", (tidx + 1).toString() + ":"));
                var item = ctelt("td", change, textLines[tidx].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0"));
                if (newTextLines.length <= 1 && baseTextLines.length <= 1) 
                    item.setAttribute("colspan", "2");
                row.appendChild(item);
                return tidx + 1;
            }
            else {
                if (side && tidx == 0 && !fieldAtTop) {
                    row.appendChild(ctelt("th", "field", element));
                    fieldAtTop = true;
                }
                else 
                    if (side) 
                        row.appendChild(celt("th", "field"));
                row.appendChild(celt("td", "count"));
                var item = celt("td", "empty");
                if (!side) 
                    item.setAttribute("colspan", "2");
                row.appendChild(item);
                return tidx;
            }
        }
        
        function addCellsInline(row, tidx, tidx2, textLines, change){
            row.appendChild(telt("th", tidx == null ? "" : (tidx + 1).toString()));
            row.appendChild(telt("th", tidx2 == null ? "" : (tidx2 + 1).toString()));
            row.appendChild(ctelt("td", change, textLines[tidx != null ? tidx : tidx2].replace(/\t/g, "\u00a0\u00a0\u00a0\u00a0")));
        }
        for (var idx = 0; idx < opcodes.length; idx++) {
            code = opcodes[idx];
            change = code[0];
            var b = code[1];
            var be = code[2];
            var n = code[3];
            var ne = code[4];
            var rowcnt = Math.max(be - b, ne - n);
            var toprows = [];
            var botrows = [];
            
            for (var i = 0; i < rowcnt; i++) {
                // jump ahead if we've alredy provided leading context or if this is the first range
                if (contextSize && opcodes.length > 1 && ((idx > 0 && i == contextSize) || (idx == 0 && i == 0)) && change == "equal") {
                    var jump = rowcnt - ((idx == 0 ? 1 : 2) * contextSize);
                    if (jump > 1) {
                        toprows.push(node = document.createElement("tr"));
                        
                        b += jump;
                        n += jump;
                        i += jump - 1;
                        node.appendChild(telt("th", "..."));
                        if (!inline) 
                            node.appendChild(ctelt("td", "skip", ""));
                        node.appendChild(telt("th", "..."));
                        node.appendChild(ctelt("td", "skip", ""));
                        
                        // skip last lines if they're all equal
                        if (idx + 1 == opcodes.length) {
                            break;
                        }
                        else {
                            continue;
                        }
                    }
                }
                
                toprows.push(node = document.createElement("tr"));
                if (inline) {
                    if (change == "insert") {
                        addCellsInline(node, null, n++, newTextLines, change);
                    }
                    else 
                        if (change == "replace") {
                            botrows.push(node2 = document.createElement("tr"));
                            if (b < be) 
                                addCellsInline(node, b++, null, baseTextLines, "delete");
                            if (n < ne) 
                                addCellsInline(node2, null, n++, newTextLines, "insert");
                        }
                        else 
                            if (change == "delete") {
                                addCellsInline(node, b++, null, baseTextLines, change);
                            }
                            else {
                                // equal
                                addCellsInline(node, b++, n++, baseTextLines, change);
                            }
                }
                else {
                
                    b = addCells(node, b, be, baseTextLines, change, true);
                    n = addCells(node, n, ne, newTextLines, change, false);
                }
            }
            
            for (var i = 0; i < toprows.length; i++) 
                rows.push(toprows[i]);
            for (var i = 0; i < botrows.length; i++) 
                rows.push(botrows[i]);
        }
        
        //rows.push(node = ctelt("th", "author", "diff view generated by "));
        //node.setAttribute("colspan", inline ? 3 : 4);
        //node.appendChild(node2 = telt("a", "jsdifflib"));
        //node2.setAttribute("href", "http://snowtide.com/jsdifflib");
        
        tdata.push(node = document.createElement("tbody"));
        for (var i = 0; i < rows.length ; i++)
            node.appendChild(rows[i]);
        
        //node = celt("table", "diff" + (inline ? " inlinediff" : ""));
        //for (var idx in tdata) node.appendChild(tdata[idx]);
        return node;
    }
}

```