---
title: "ModelUtils"
id: "modelutils"
---

API Name: global.ModelUtils

```js
var ModelUtils = Class.create();
ModelUtils.prototype = {
	initialize: function() {
	},

	type: 'ModelUtils'
};

ModelUtils.getCondition = function(model){
	var condition = model.manufacturer.changes() || model.name.changes() || model.version.changes() || model.edition.changes();
	var modelClass = model.sys_class_name.toString();
	if (model.sys_class_name.toString() === 'cmdb_software_product_model' &&  GlidePluginManager.isActive('com.snc.sams')) {
		condition = condition || model.platform.changes() || model.language.changes() || model.named_user_type.changes() || model.database_option.changes();
	} else if (GlidePluginManager.isActive('sn_hamp') && sn_hamp.HAMConstants.MODEL_TYPES.indexOf(modelClass) > -1){
		condition = condition || model.normalized_model.changes();
	}
	return condition;
};

// Used in HAMPUtils and SAMPSWModelUtil
ModelUtils.generateDisplayName = function(values){
	var displayName = '';

	if (values[1].toLowerCase().indexOf(values[0].toLowerCase()) != -1 && 'true'.equals(gs.getProperty('glide.cmdb_model.display_name.shorten'))) {
		values[0] = '';
	}

	for (var i = 0; i < values.length; i++){
		if (values[i] != undefined && values[i] != '') {
			displayName += ' ' + values[i];
		}
	}
	return displayName.trim();
};

// Used in HAMPUtils
ModelUtils.calculateDefaultDisplayName = function(model){
	var values = [model.manufacturer.getDisplayValue(), model.name, model.version, model.edition];
	model.display_name = ModelUtils.generateDisplayName(values);
};

ModelUtils.hasHAMAdminRole = function () {
	if (GlideDomainSupport.isDataSeparationEnabled()) {
		return (gs.hasRole('ham_admin') && gs.hasRole('domain_admin'));
	}

	return gs.hasRole('ham_admin');
};

ModelUtils.hasAssetAdminRole = function () {
	if (GlideDomainSupport.isDataSeparationEnabled()) {
		return (gs.hasRole('asset') && gs.hasRole('domain_admin'));
	}

	return gs.hasRole('asset');
};


ModelUtils.calculateDisplayName = function(model){
	var modelClass = model.sys_class_name.toString();
	if (modelClass === 'cmdb_software_product_model' && GlidePluginManager.isActive('com.snc.sams')) {
		new SAMPSWModelUtil().calculateSoftwareModelDisplayName(model);
	} else if (GlidePluginManager.isActive('sn_hamp') && sn_hamp.HAMConstants.MODEL_TYPES.indexOf(modelClass) > -1){
		sn_hamp.HAMUtils.calculateModelDisplayName(model);
	}
	else {
		global.ModelUtils.calculateDefaultDisplayName(model);
	}
};
ModelUtils.isAncestor = function (gr, ancestorTableName) {
	if (!gs.nil(gr)) {
		return gr.instanceOf(ancestorTableName);
	}
	return false;
};

ModelUtils.disableBR = function (gr) {
	gr.setWorkflow(false);
};
ModelUtils.insertDisableBR = function (gr) {
	gr.setWorkflow(false);
	return gr.insert();
};
ModelUtils.updateDisableBR = function (gr) {
	gr.setWorkflow(false);
	return gr.update();
};
ModelUtils.updateMultipleDisableBR = function (gr) {
	gr.setWorkflow(false);
	return gr.updateMultiple();
};
ModelUtils.isDomainSeparationEnabled = function() {
	return GlideDomainSupport.isDataSeparationEnabled();
};
ModelUtils.getStopWatch = function () {
	return new GlideStopWatch();
};
ModelUtils.getStopWatchTime = function (stopWatch) {
	if (stopWatch instanceof GlideStopWatch) {
		return stopWatch.toString();
	} else {
		return '';
	}
};
```