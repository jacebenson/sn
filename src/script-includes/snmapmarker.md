---
title: "SNMapMarker"
id: "snmapmarker"
---

API Name: global.SNMapMarker

```js
var SNMapMarker = Class.create();
SNMapMarker.getMapMarkerResult = getMapMarkerResult;
SNMapMarker.evaluateMarkerCondition = evaluateMarkerCondition;
SNMapMarker.getDisplayValueForEachDIResult = getDisplayValueForEachDIResult;

function getMarkerIconObjs(mapMarkerRecord) {
	var markerIconObjs = {};
	var m2mMarkerIconsMarkerGR = GlideRecord("m2m_map_marker_marker_icon");
	m2mMarkerIconsMarkerGR.addQuery("marker", mapMarkerRecord.sys_id);
	m2mMarkerIconsMarkerGR.query();
	while(m2mMarkerIconsMarkerGR.next()) {
		var markerIconObj = {};
		var markerIconRecord = m2mMarkerIconsMarkerGR.getElement("marker_icon");
		// NEXT: url vs attachment url
		markerIconObj["single"] = markerIconRecord.single_icon_url+"";
		markerIconObj["multiple"] = markerIconRecord.co_located_icon_url+"";
		markerIconObj["scripted_condition"] = markerIconRecord.scripted_condition+"";
		markerIconObj["level"] = markerIconRecord.level;
		var id = markerIconRecord.sys_id;
		markerIconObjs[id] = markerIconObj;
	}
	return markerIconObjs;
}

function evaluateMarkerCondition(condition, input){
	var param = new Packages.java.util.HashMap();
	param.put("current", input);
	return GlideEvaluator.evaluateStringWithGlobals(condition, param);
}

function getClickActionList(mapMarkerRecord) {
	var result = [];
	var m2mClickActionToMarkerGr = GlideRecord("m2m_map_marker_map_marker_click_action");
	m2mClickActionToMarkerGr.addQuery("marker", mapMarkerRecord.sys_id);
	m2mClickActionToMarkerGr.orderBy("order");
	m2mClickActionToMarkerGr.query();
	while(m2mClickActionToMarkerGr.next()) {
		var clickActionGr = m2mClickActionToMarkerGr.marker_click_action.getRefRecord();
		var clickAcionObj = {};
		result.push(clickAcionObj);
		clickAcionObj["action_type"] = clickActionGr.getValue("action_type");
		switch (clickAcionObj["action_type"]) {
			default:
			case SNMapConstants.click_action.type["DISPLAY_FORM"]:
				var formTitleFieldName = "dialog_form_title";
				clickAcionObj[formTitleFieldName] = clickActionGr.getDisplayValue(formTitleFieldName);
				clickAcionObj[formTitleFieldName] = gs.nil(clickAcionObj[formTitleFieldName]) ? "" : clickAcionObj[formTitleFieldName];
				if (!gs.nil(clickActionGr.dialog_form_view)) {
					var formDialogViewRec = clickActionGr.dialog_form_view.getRefRecord();
					if (formDialogViewRec) {
						clickAcionObj["dialog_form_view"] = formDialogViewRec.getValue("name");
					}
				}
				break;
			case SNMapConstants.click_action.type["SCRIPT"]:
				clickAcionObj["script"] = clickActionGr.getValue("script");
				break;
		}
		clickAcionObj["order"] = m2mClickActionToMarkerGr.getValue("order");
		clickAcionObj["order"] = clickAcionObj["order"] ? Number(clickAcionObj["order"]) : null;

	}
	return result;
}
function getMapMarkerResult(mapMarkerRecord) {
	var result = {};
	var mapMarkerObj = {};
	result[mapMarkerRecord.sys_id] = mapMarkerObj;
	mapMarkerObj.d_model = mapMarkerRecord.getValue("data_item");
	mapMarkerObj.click_action_list = getClickActionList(mapMarkerRecord);
	// loop for marker icons
	mapMarkerObj.icons = getMarkerIconObjs(mapMarkerRecord);
	
	return result;
}

function getDisplayValueForEachDIResult(mapMarkerRecord, dataItemGRResult) {
	var result = dataItemGRResult.getDisplayValue();
	if (!gs.nil(mapMarkerRecord) && !gs.nil(dataItemGRResult)) {
		switch(mapMarkerRecord.getValue("title_type")) {
			case "field":
				result = dataItemGRResult.getDisplayValue(mapMarkerRecord.display_field);
				break;
			case "script":
				result = getDisplayValueFromScript(mapMarkerRecord, dataItemGRResult);
				break;
		}
	}
	return result;
}

function getDisplayValueFromScript(mapMarkerRecord, dataItemGRResult) {
	var evaluator = new GlideScopedEvaluator();
	evaluator.putVariable('current', dataItemGRResult);
	evaluator.putVariable('answer', '');
	evaluator.evaluateScript(mapMarkerRecord, "display_value_script");
	return evaluator.getVariable('answer');
}
```