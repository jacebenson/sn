---
title: "SNMapDataItem"
id: "snmapdataitem"
---

API Name: global.SNMapDataItem

```js
var SNMapDataItem = Class.create();
SNMapDataItem.getDataItemWithMarker = getDataItemWithMarker;
SNMapDataItem.getSimpleResult = getSimpleResult;
function getScriptedConditionResult(dataItemGR, input) {
	var evaluator = new GlideScopedEvaluator();
	evaluator.putVariable('answer', "");
	evaluator.putVariable('input', input);
	evaluator.evaluateScript(dataItemGR, "query_condition_script");
	return evaluator.getVariable('answer');
}
function getDIGRWithInitialQueryCondition(dataItemGR, mapPageRecord, mapInputData) { 
	if (gs.nil(dataItemGR) || gs.nil(mapPageRecord)) {
		gs.error("map: getDIGRWithInitialQueryCondition: dataItemGR or mapPageRecord is invalid.");
		return;
	}
	var result = GlideRecord(dataItemGR.table);
	switch(dataItemGR.getValue("condition_type")) {
		case "declarative":
			result.addEncodedQuery(dataItemGR.conditions);
			break;
		case "scripted":
			var input = {
				"map_page_sys_id": mapPageRecord.getValue("sys_id"),
				"data_item_sys_id": dataItemGR.getValue("sys_id")
			};
			if(!gs.nill(mapInputData))
				input = extendObject(input, mapInputData);
			result.addEncodedQuery(getScriptedConditionResult(dataItemGR, input));
			break;
		default:
			gs.error("sn-map: failed to find proper condition type in data item - " + dataItemGR.getDisplayValue());
			break;
	}
	return result;
}
function getDataItemWithMarker(mapPageRecord, filterItemVals, filterItems, mapInputData) {
// 	gs.log("map: filterItemVals: "+JSON.stringify(filterItemVals))
// 	gs.log("map: filterItems: "+JSON.stringify(filterItems))
	if (!mapPageRecord) { return {}; }
	var dataItemList = {};
	var mapMarkerList = {};
	var result = {
		"data_item" : dataItemList,
		"marker" : mapMarkerList,
    };
    // get map markers
	var m2mMapMarkersRecord = GlideRecord("m2m_map_page_map_marker");
	m2mMapMarkersRecord.addQuery("map_page", mapPageRecord.sys_id);
	m2mMapMarkersRecord.query();
	// loop in each data item record for the map page
	while(m2mMapMarkersRecord.next()) {
        var mapMarkerRecord = m2mMapMarkersRecord.map_marker.getRefRecord();
		var localMapMarkerList = global.SNMapMarker.getMapMarkerResult(mapMarkerRecord);
		mapMarkerList = extendObject(mapMarkerList,localMapMarkerList);
        var dataItemGR = mapMarkerRecord.data_item.getRefRecord();
        if (gs.nil(dataItemGR)) {
            gs.error("Data item is invalid in map marker record: " + m2mMapMarkersRecord.sys_id);
            continue;
        }
        var coordDefinitionGR = mapMarkerRecord.coordinate_definition.getRefRecord();
        if (gs.nil(dataItemGR)) {
            gs.error("Coord definition is invalid in map marker record: " + m2mMapMarkersRecord.sys_id);
            continue;
        }
		var dataItemObj = {};
		var dataItemResult = {};
		dataItemObj.data = dataItemResult;
		dataItemList[dataItemGR.sys_id] = dataItemObj;
		// loop in each marker

		var dataItemGRResult = getDIGRWithInitialQueryCondition(dataItemGR, mapPageRecord, mapInputData);
        // add encodedQueryStr based on the filter item value
		var encodedQueryStr = SNMapFilterItem.getEncodedQueryStrFromFilterDataMapping(filterItemVals, filterItems, dataItemGR);
		if (!gs.nil(encodedQueryStr)) {
			dataItemGRResult.addEncodedQuery(encodedQueryStr);	
		}
		if (SNMapPageUtil.isDebuggEnabled()) {
			gs.log("snmap: the encoded query of dataItemGRResult: " + dataItemGRResult.getEncodedQuery());
		}
		dataItemGRResult.query();
		// loop in each record for the data item
		while(dataItemGRResult.next()){
			var dataItem = {};
			// todo: if display on map
			var coordinates = global.SNMapCoordinateDefination.getCoordForEachDIesult(coordDefinitionGR, dataItemGRResult);
			if (coordinates) {
				dataItem.loc = coordinates;
			} else {
				continue;
			}
			dataItemResult[dataItemGRResult.sys_id] = dataItem;
			dataItem.table_name = dataItemGRResult.getTableName();
			dataItem.disp_v = global.SNMapMarker.getDisplayValueForEachDIResult(mapMarkerRecord, dataItemGRResult);
			
			for (var id in localMapMarkerList){
				var icons = localMapMarkerList[id].icons;
				for (var inner_id in icons){
					icon = icons[inner_id];
					var pass = global.SNMapMarker.evaluateMarkerCondition(icon.scripted_condition, dataItemGRResult);
					if (pass == true) {
						dataItem["icon"] = inner_id;
						dataItem["icon_level"] = icon.level;
						break;
					}
				}
			}
			// NEXT: get field list from form
			var selectedFieldList = [];
			// var selectedFieldList = ["short_description", "assigned_to"];
			var fieldListIdx = 0;
			for (fieldListIdx = 0; fieldListIdx<selectedFieldList.length; fieldListIdx++) {
				var field = selectedFieldList[fieldListIdx];
				var fieldElement = dataItemGRResult.getElement(field);
				if (!gs.nil(fieldElement)) {
					dataItem[field] = fieldElement.getDisplayValue();
				}
			}
		}
	}
	return result;
}
function extendObject(object1, object2){
	for (var key in object2){
		object1[key] = object2[key];
	}
	return object1;
}
function getSimpleResult(dataItemGR, mapPageRecord) { 
	var result = getDIGRWithInitialQueryCondition(dataItemGR, mapPageRecord);//TODO: check if mapData needed here too
	result.query();
	return result;
}
```