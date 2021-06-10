---
title: "SNMapFilterItem"
id: "snmapfilteritem"
---

API Name: global.SNMapFilterItem

```js
var SNMapFilterItem = Class.create();
SNMapFilterItem.getFilterItem = getFilterItem;
SNMapFilterItem.getEncodedQueryStrFromFilterDataMapping = getEncodedQueryStrFromFilterDataMapping;
function getScriptedResult(inputGR, scriptedFieldName) {
	if (gs.nil(scriptedFieldName)) {
		gs.error("Map page: scriptedFieldName is invalid.");
	}
	var evaluator = new GlideScopedEvaluator();
	evaluator.putVariable('answer', "");
	evaluator.evaluateScript(inputGR, scriptedFieldName);
	return evaluator.getVariable('answer');
}
function getDataItemResultForSelections(filterItemGR, mapGR) {
	var dataItemGR = filterItemGR.data_item.getRefRecord();
	var dataItemGRResult = SNMapDataItem.getSimpleResult(dataItemGR, mapGR);
	var result = {};
	while(dataItemGRResult.next()) {
		var grObj = {};
		result[dataItemGRResult.getValue("sys_id")] = grObj;
		grObj.label = dataItemGRResult.getDisplayValue();
		grObj.val = dataItemGRResult.getElement(filterItemGR.getValue("data_item_value_field")).getValue();
	}
	return result;
}
function getOptionsForSingleAndMultiple(filterItemObj, filterItemGR, mapGR) {
	switch (filterItemObj.data_type) {
		case "data_item":
			return getDataItemResultForSelections(filterItemGR, mapGR);
		case "scripted":
			return getScriptedResult(filterItemGR, "script");
		default:
			return {};
	}
}
function getFilterDataMapping(filterItemGR, mapGR) {
	var result = {};
	var FDMappingGR = GlideRecord("cmn_map_filter_data_mapping");
	FDMappingGR.addQuery("filter_item", filterItemGR.sys_id);
	FDMappingGR.addQuery("map_page", mapGR.sys_id);
	FDMappingGR.query();
	while(FDMappingGR.next()) {
		var FDMappingObj = {};
		var dataItemSysId = FDMappingGR.getValue("data_item");
		if (!result[dataItemSysId]) {
			result[dataItemSysId] = [];
		}
		result[dataItemSysId].push(FDMappingObj);
		FDMappingObj.table = FDMappingGR.getValue("table");
		FDMappingObj.field = FDMappingGR.getValue("field");
	}
	return result;
}
function getFilterItem(mapGR) {
	if (gs.nil(mapGR) || gs.nil(mapGR.filter)) {
		return;
	}
	var filterItemList = [];
	// get filter items
	var m2mMapPageFilterGR = GlideRecord("m2m_map_filter_to_filter_item");
	m2mMapPageFilterGR.addQuery("map_filter", mapGR.filter);
	m2mMapPageFilterGR.orderBy("order");
	m2mMapPageFilterGR.query();
	while(m2mMapPageFilterGR.next()) {
		var filterItemGR = m2mMapPageFilterGR.map_filter_item.getRefRecord();
		if (gs.nil(filterItemGR)) { continue; }
		var filterItemObj = {};
		filterItemList.push(filterItemObj);
		filterItemObj.label = filterItemGR.getDisplayValue("label");
		filterItemObj.ui_type = filterItemGR.getValue("ui_type");
		switch(filterItemObj.ui_type) {
			case "single_selection":
				filterItemObj.value = getScriptedResult(filterItemGR, "default_value_script");
			case "multiple_selection":
				filterItemObj.data_type = filterItemGR.getValue("data_type");
				/** options format:
				{
					"unique_id": {
						"label": "new",
						"val": 1,
					},
					...
				}
				**/
				filterItemObj.sel_options = getOptionsForSingleAndMultiple(filterItemObj,filterItemGR, mapGR);
				break;
			case "date_picker":
				filterItemObj.value = getScriptedResult(filterItemGR, "default_value_script");
				if (gs.nil(filterItemObj.value) || filterItemObj.value === "") {
					// set default to current day
					filterItemObj.value = GlideDate().toString();
				}
				break;
			default:
				break;
		}
		
		// get filter parameters
		filterItemObj.f_d_mapping = getFilterDataMapping(filterItemGR, mapGR);
	}
    return filterItemList;
}
function getEncodedQueryStrFromFilterDataMapping(filterItemVals, filterItems, dataItemGR) {
	var isUsingUpdatedFilterItem = !gs.nil(filterItemVals) && filterItemVals.length > 0;
	if (!isUsingUpdatedFilterItem && (gs.nil(filterItems) || filterItems.length < 1 )) {
		return "";
	}
	var result = [];
	
	var filterItemValuesUsed = isUsingUpdatedFilterItem ? filterItemVals : filterItems;
	
	for (var filterItemValIdx in filterItemValuesUsed) {
		var filterItemVal = filterItemValuesUsed[filterItemValIdx];
		if (gs.nil(filterItemVal.f_d_mapping)) {
			gs.error("snmap:filterItemVal " + filterItemVal.label + " does not have valid " + "filter data mapping");
			continue;
		}
		var FDMappings = filterItemVal.f_d_mapping;
		if (FDMappings[dataItemGR.sys_id]) {
			var FDMappingArr = FDMappings[dataItemGR.sys_id];
			for (var FDMappingIdx in FDMappingArr) {
				var FDMapping = FDMappingArr[FDMappingIdx];
				// check if tables match
				if (dataItemGR.table != FDMapping.table) {
					gs.error("snmap: data item " + dataItemGR + " has different table from filter data mapping.");
					return;
				}
				gs.log("snmap:filterItemVal.ui_type" + filterItemVal.ui_type)
				switch(filterItemVal.ui_type) {
						
					case "date_picker":
						// get the date object from the value in right timezone
						// use GlideDateTime in case it has hour and min
						var gDT = new GlideDateTime(filterItemVal.value); 
						var filterItemDateVal = new GlideDate();
						filterItemDateVal.setValue(gDT.getDate());
						var formatedDateString = filterItemDateVal.getByFormat("yyyy-MM-dd");
						var scriptedDateQueryStringVal = "javascript:gs.dateGenerate('" + formatedDateString + " 00:00:00')";
						result.push(FDMapping.field + ">=" + scriptedDateQueryStringVal);
						scriptedDateQueryStringVal = "javascript:gs.dateGenerate('" + formatedDateString + " 23:59:59')";
						result.push(FDMapping.field + "<=" + scriptedDateQueryStringVal);
						break;
					case "single_selection":
						result.push(FDMapping.field + "=" + filterItemVal.value);
						break;
					case "multiple_selection":
						var valueStringArr = [];
						for (var selOptionKey in filterItemVal.sel_options) {
							var selOptionObj = filterItemVal.sel_options[selOptionKey];
							selOptionObj.sel = selOptionObj.hasOwnProperty('sel') ? selOptionObj.sel : true;
							if (selOptionObj.sel == false) {
								valueStringArr.push(selOptionObj.val);
							}
						}
						if (valueStringArr.length > 0) {
							result.push(FDMapping.field + "NOT IN" + valueStringArr.join(","));
						}
						break;
				}
			}
		}
	}
	
	return result.join("^");
}
```