---
title: "SPDiagnosticsDriver"
id: "spdiagnosticsdriver"
---

API Name: global.SPDiagnosticsDriver

```js
var SPDiagnosticsDriver = Class.create();
SPDiagnosticsDriver.prototype = Object.extendsObject(AbstractAjaxProcessor, {

	widgetCategorization: new SPWidgetCategorization(),

	/* Constants */
	// Table Names
	TBL: {
		SP_REL_WID_CLONE: 'sp_rel_widget_clone',
		SYS_UPDATE_VERSION: 'sys_update_version',
		SP_WIDGET: 'sp_widget'
	},

	// Column Names
	COL: {
		NAME: 'name',
		SRC_TBL: 'source_table',
		STATE: 'state'
	},

	// Categories
	CATEGORY: {
		UNCATEGORIZED: 0,
		OOTB: 1,
		CLONED: 2,
		BRAND_NEW: 3,
		CUSTOMIZED: 4
	},

	// Column Values
	OOTB_TBLS: ['sys_upgrade_history', 'sys_store_app'],
	CHILD: 'child',
	NAME: 'name',
	DESCRIPTION: 'description',
	SYS_CLASS_NAME: 'sys_class_name',
	SP_INSTANCE: 'sp_instance',
	SP_WIDGET: 'sp_widget',
	CURRENT: 'current',
	PREVIOUS: 'previous',

	// Entry point for the Ajax Call to be made from client side
	categorize: function (arrIDs) {
		var strInstanceIds = this.getParameter('sysparm_instances_array') || arrIDs;
		if (!strInstanceIds)
			return;

		var instWidgetMap = this.categorizeInstances(JSON.parse(strInstanceIds)) || {} ;
		return JSON.stringify(instWidgetMap);
	},

	categorizeInstances: function (arrInstanceIds) {

		var widgetCustMap = {};
		var processed = {};
		var widgetCustDetailsObj = {};
		var instanceCustDetailsObj = {};
		var shouldItProcess = false;
		var retObj = {};
		var instWidgetMap;

		instWidgetMap = _getInstanceToWidgetsMap.call(this, arrInstanceIds) || {};

		for (var instanceId in instWidgetMap) {

			var widgetId = instWidgetMap[instanceId];
			shouldItProcess = !processed[widgetId];

			if (shouldItProcess) {
				widgetCustDetailsObj = _categorizeWidget.call(this, widgetId);
				delete widgetCustDetailsObj.isCategorized;
				widgetCustMap[widgetId] = widgetCustDetailsObj;
				processed[widgetId] = true;
			} else
				widgetCustDetailsObj = widgetCustMap[widgetId];

			instanceCustDetailsObj.widgetCustDetails = widgetCustDetailsObj;
			retObj[instanceId] = JSON.parse(JSON.stringify(instanceCustDetailsObj));
		}
		return retObj;
	},

	type: 'SPDiagnosticsDriver'
});

// Private functions

function _getWidgetDetails (widSysId) {

	var retObj = {
		name: '',
		description: ''
	};
	var grTBL = new GlideRecord(this.SP_WIDGET);
	if (grTBL.get(widSysId)) {
		retObj.name = grTBL.getValue(this.NAME) || '';
		retObj.description = grTBL.getValue(this.DESCRIPTION) || '';
		this.TBL.SP_WIDGET = grTBL.getValue(this.SYS_CLASS_NAME) || this.SP_WIDGET;
	}
	return retObj;
}

function _getInstanceToWidgetsMap (instanceIdArr) {

	var instWidgetMap = {};
	var instArrlength =  instanceIdArr.length;
	var	instanceId;
	var	widgetId;
	var	index;

	for (index = 0; index < instArrlength; index++) {
		instanceId = instanceIdArr[index];
		widgetId = _getWidgetForInstance.call(this, instanceId);
		instWidgetMap[instanceId] = widgetId;
	}

	return instWidgetMap;
}

function _getWidgetForInstance (instanceId) {

	var grSPInstance = new GlideRecord(this.SP_INSTANCE);
	if (grSPInstance.get(instanceId))
		return grSPInstance.getValue(this.SP_WIDGET);
	else
		return instanceId; // For embedded widgets instanceId itself is the widgetId
}

// Main function called for categorizing each widget
function _categorizeWidget (widgetId) {

	var widgetDetails = _getWidgetDetails.call(this, widgetId);

	var widgetCustomizationMetaCloned = {
		widSysId: widgetId,
		categoryCheck: this.CATEGORY.CLONED,
		custCheck: false,
		table: this.TBL.SP_REL_WID_CLONE,
		firstEncodedQuery: this.CHILD + '=' + widgetId
	};

	var widgetCustomizationMetaNew = {
		widSysId: widgetId,
		categoryCheck: this.CATEGORY.BRAND_NEW,
		custCheck: false,
		table: this.TBL.SYS_UPDATE_VERSION,
		firstEncodedQuery: this.COL.NAME + '=' + this.TBL.SP_WIDGET + '_' + widgetId,
		secondEncodedQuery: this.COL.SRC_TBL + 'IN' + this.OOTB_TBLS.toString()
	};

	var widgetCustomizationMetaCustomized = {
		widSysId: widgetId,
		categoryCheck: this.CATEGORY.CUSTOMIZED,
		custCheck: true,
		firstEncodedQuery: this.COL.STATE + '=' + this.PREVIOUS,
		secondEncodedQuery: this.COL.SRC_TBL + 'IN' + this.OOTB_TBLS.toString(),
		thirdEncodedQuery: this.COL.STATE + '=' + this.CURRENT,
		sysClassName: this.TBL.SP_WIDGET
	};

	var catObj = this.widgetCategorization.isWidgetCategorized(widgetCustomizationMetaCloned);
	if (!catObj.isCategorized) {
		catObj = this.widgetCategorization.isWidgetCategorized(widgetCustomizationMetaNew);
		if (!catObj.isCategorized) {
			catObj = this.widgetCategorization.isWidgetCategorized(widgetCustomizationMetaCustomized);
			if (!catObj.isCategorized)
				catObj.category = this.CATEGORY.OOTB;
		}
	}
	catObj.name = widgetDetails.name;
	catObj.description = widgetDetails.description;

	return catObj;
}
```