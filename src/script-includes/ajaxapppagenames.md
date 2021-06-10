---
title: "AJAXAppPageNames"
id: "ajaxapppagenames"
---

API Name: sn_tourbuilder.AJAXAppPageNames

```js
var AJAXAppPageNames = Class.create();
AJAXAppPageNames.prototype = Object.extendsObject(global.AbstractAjaxProcessor, {
	getAppPageNames : function(){
		 var pages = {
			 portals: [],
			 portalPages:[]
		 };
		var elem = null;
		// check if sp_page and sp_portal tables exist
	    var gr = new GlideRecord('sp_page');
		if(gr.isValid()){
			gr.orderBy('title');
			gr.query();

			while(gr.next()){
				elem = {
					title: gr.title.toString(),
					id: gr.id.toString(),
					sys_id: gr.sys_id.toString()
				};
				pages.portalPages.push(elem);
			}
		}

		gr = new GlideRecord('sp_portal');
		if(gr.isValid()){
			gr.orderBy('title');
			gr.query();

			while(gr.next()){
				elem = {
					title: gr.title.toString(),
					url_suffix: gr.url_suffix.toString(),
					sys_id: gr.sys_id.toString()
				};
				pages.portals.push(elem);
			}
		}

		var allPages =  new global.JSON().encode(pages);
		return allPages;
	},
	/**
	* Return Application Page Names containing given search string
	* Below API is used in REST API
	*/
	getPlatfromPageNames: function(option){
		var name = unescape(option.name.toString()).toLowerCase().trim(),
			limit = option.limit,
			offset = option.offset,
			totalRecords,
			data = [];
		//skip Form, List, .do or _list.do from the search string.
		var words = name.split(" ");
		var nqs = "", // normalized query string
			qs = "",  // original query string.
			all = false,
			form = false,
			endsWith = "",
			list = false,
			i;
			if(words.length > 1){
				qs = nqs = name.trim();
				endsWith = name.substr(name.lastIndexOf(" "), name.length).trim();
				if("list".indexOf(endsWith) === 0){
				    nqs = name.substr(0, name.lastIndexOf(" "));
					list = true;
				} else if ("form".indexOf(endsWith) === 0){
					nqs = name.substr(0, name.lastIndexOf(" "));
					form = true;
				} else{
					all = true;
				}
			} else if(words.length === 1 && words[0] !== "") {
				qs = nqs = words[0].split(".")[0];
				endsWith = qs.substr(qs.lastIndexOf("_"), qs.length).trim();
				if("_list".indexOf(endsWith) === 0){
					nqs = qs.substr(0, qs.lastIndexOf("_"));
					list = true;
				} else if(words[0].indexOf(".") > 0){
					form = true;
				} else{
					all = true;
				}
			} else {
				qs = nqs = "";
				all = true;
			}
		var gr = new GlideRecord('sys_db_object');
		var qc;

		if(all){
			qc = gr.addQuery('name', 'CONTAINS', qs);
			qc.addOrCondition('name','CONTAINS', nqs);
			qc.addOrCondition('label','CONTAINS', qs);
			qc.addOrCondition('label','CONTAINS', nqs);
		}else {
			qc = gr.addQuery('name', qs);
			qc.addOrCondition('name', nqs);
			qc.addOrCondition('label', qs);
			qc.addOrCondition('label', nqs);
		}

			gr.orderBy('name');
			gr.chooseWindow(offset, offset+limit);
			gr.query();
			totalRecords  = gr.getRowCount();

			if((offset == 0) && (form || all) && 'home page'.indexOf(qs) == 0){
				data.push({
					name :  "home.do",
					label : "Home Page"
				});
			}
			if(all){
				while(gr.next()){
					data.push({
						name : gr.name.toString() + ".do",
						label :gr.label.toString() + " Form"
					});
					data.push({
						name : gr.name.toString() + "_list.do",
						label :gr.label.toString() + " List"
					});
				 }
			} else if(form){
				while(gr.next()){
					data.push({
						name : gr.name.toString() + ".do",
						label : gr.label.toString() + " Form"
					});
				}
			} else if(list){
				while(gr.next()){
					data.push({
						name : gr.name.toString() + "_list.do",
						label :gr.label.toString() + " List"
					});
				 }
			}

		return { data:data, totalRecords:totalRecords};
	},
    type: 'AJAXAppPageNames'
});
```