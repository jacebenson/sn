---
title: "UIParameterListFieldNamesProvider"
id: "uiparameterlistfieldnamesprovider"
---

API Name: global.UIParameterListFieldNamesProvider

```js
var UIParameterListFieldNamesProvider = Class.create();
UIParameterListFieldNamesProvider.prototype = Object.extendsObject(AbstractAjaxProcessor, {
	getAllowedFieldNames: function(){
		var tableName = this.getParameter("table_name");
		var listType = this.getParameter("list_type");
		if(listType == "list")
			this._getListValues(tableName);
		else if(listType == "search_list")
			this._getSearchListValues(tableName);		
	},
	
	_getSearchListValues: function(tableName){
		this._getListValuesCommon(tableName, false);
	},
	
	_getListValues: function(tableName){
		this._getListValuesCommon(tableName, true);
	},	
	
	_getListValuesCommon: function(tableName, use_choices){
		var gr = new GlideRecord(tableName);
		var ge = gr.getElements();
		var edArray = [];
		for(var i = 0; i < ge.size(); i++){
			var ed = ge.get(i).getED();
			if(ed.isReference() || (use_choices && ed.isChoiceTable()))
				edArray.push(ge.get(i).getED());
		}
		
		edArray.sort(this._compare);
		for(i = 0; i < edArray.length; i++){
			var result = this.newItem("result");
			result.setAttribute("name", edArray[i].getName());
			result.setAttribute("label", edArray[i].getLabel());
		}
	},
	
	_compare: function(a,b) {
	  if (a.getLabel() < b.getLabel())
		return -1;
	  if (a.getLabel() > b.getLabel())
		return 1;
	  return 0;
	},

    type: 'UIParameterListFieldNamesProvider'
});
```