---
title: "SNMapCoordinateDefination"
id: "snmapcoordinatedefination"
---

API Name: global.SNMapCoordinateDefination

```js
var SNMapCoordinateDefination = Class.create();
SNMapCoordinateDefination.getCoordForEachDIesult = getCoordForEachDIesult;
function getCoordFromScript(coord, gr, eachDataItemResult) {
	var evaluator = new GlideScopedEvaluator();
	evaluator.putVariable('current', eachDataItemResult);
	evaluator.putVariable('coord', coord);
	evaluator.evaluateScript(gr, "script");
}
function getCoordFromFields(coord, gr, eachDataItemResult) {
	coord.lat = eachDataItemResult.getElement(gr.latitude_field).getValue();
	coord.lng = eachDataItemResult.getElement(gr.longitude_field).getValue();
}
function sendErrorForNilCoord(dataItemGRResult) {
	if (!SNMapPageUtil.isDebuggEnabled()) { return; }
	gs.error("snmap: lat or lng is invalid for the data item result: " + dataItemGRResult.getDisplayValue());
}
function getCoordForEachDIesult(coordDefinitionGR, dataItemGRResult){
	var result;
	if (!gs.nil(coordDefinitionGR)) {
		var coord = {
			"lat": null,
			"lng": null,
		};
		switch(coordDefinitionGR.getValue("type")) {
			case "field":
				getCoordFromFields(coord, coordDefinitionGR, dataItemGRResult);
				break;
			case "script":
				getCoordFromScript(coord, coordDefinitionGR, dataItemGRResult);
				break;
			default:
				gs.error("sn-map: failed to find correct type in Coordinate Defination.");
		}
		if (gs.nil(coord["lat"]) || gs.nil(coord["lng"])) {
			sendErrorForNilCoord(dataItemGRResult);
		} else {
			var latNum = Number(coord["lat"]);
			var lngNum = Number(coord["lng"]);
			if (latNum && lngNum) {
				result = {};
				result.lat = latNum;
				result.lng = lngNum;
			} else {
				sendErrorForNilCoord(dataItemGRResult);
			}
		}
	}
	return result;
}

```