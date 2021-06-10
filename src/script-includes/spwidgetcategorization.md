---
title: "SPWidgetCategorization"
id: "spwidgetcategorization"
---

API Name: global.SPWidgetCategorization

```js
var SPWidgetCategorization = Class.create();
SPWidgetCategorization.prototype = {

	ENCODED_QUERY_BASELINE: '',
	ENCODED_QUERY_PREVIOUS: '',
	ENCODED_QUERY_CURRENT: '',
	/* Constants */
	// Table Names
	TBL: {
		SYS_UPDATE_VERSION: 'sys_update_version',
		// Widget Dependency
		M2M_SP_WID_DEP: 'm2m_sp_widget_dependency',
		SP_WID_DEP: 'sp_dependency',
		M2M_SP_JS_INC: 'm2m_sp_dependency_js_include',
		M2M_SP_CSS_INC: 'm2m_sp_dependency_css_include',
		// ngProvider
		M2M_SP_NG_PRO: 'm2m_sp_ng_pro_sp_widget',
		SP_NG_PRO: 'sp_angular_provider',
		// ngTemplate
		SP_NG_TMPL: 'sp_ng_template',
		// SP Widget
		SP_WIDGET: 'sp_widget'
	},

	// Column Names
	COL: {
		NAME: 'name',
		SRC_TBL: 'source_table',
		SP_WID: 'sp_widget',
		SP_WID_DEP: 'sp_dependency',
		SYS_UPDATED_BY: 'sys_updated_by',
		SYS_CREATED_ON: 'sys_created_on'
	},

	// Types of meta items to check
	TYPE: {
		WIDGET: 'sp_widget',
		WID_DEP: 'sp_dependency',
		NG_PRO: 'sp_angular_provider',
		NG_TMPL: 'sp_ng_template'
	},

	// Categories
	CATEGORY: {
		UNCATEGORIZED: 0,
		OOTB: 1,
		CLONED: 2,
		BRAND_NEW: 3,
		CUSTOMIZED: 4,
		CUSTOMIZED_DEP: 5,
		CUSTOMIZED_NG_PRO: 6,
		CUSTOMIZED_NG_TMPL: 7
	},

	// Column Values
	SYS_UPDATE_SET: 'sys_update_set',
	ID: 'id',

	// User
	USR_ADMIN: 'admin',

	/* Core Methods */
	isWidgetCategorized: function (widgetCustomizationMeta) {

		var custcheck = widgetCustomizationMeta.custCheck;
		var categoryCheck = widgetCustomizationMeta.categoryCheck;
		var widSysId = widgetCustomizationMeta.widSysId;
		var m2mDepsCustObj;
		var m2mNGProCustObj;
		var m2mTemplCustObj;
		var arrTemplates;
		var retObj = {
			widSysId: widgetCustomizationMeta.widSysId,
			isCategorized: false,
			category: this.CATEGORY.UNCATEGORIZED,
			dependencies: [],
			providers: [],
			templates: []
		};

		if (categoryCheck === this.CATEGORY.BRAND_NEW
			|| categoryCheck === this.CATEGORY.CLONED) {

			var grTBL = new GlideRecord(widgetCustomizationMeta.table);
			grTBL.setLimit(1);
			grTBL.addEncodedQuery(widgetCustomizationMeta.firstEncodedQuery);
			grTBL.query();

			if (grTBL.hasNext()) {

				if (widgetCustomizationMeta.categoryCheck === this.CATEGORY.BRAND_NEW) {
					grTBL = new GlideRecord(widgetCustomizationMeta.table);
					grTBL.setLimit(1);
					grTBL.addEncodedQuery(widgetCustomizationMeta.firstEncodedQuery + '^' + widgetCustomizationMeta.secondEncodedQuery);
					grTBL.query();

					if (!grTBL.hasNext())
						retObj.isCategorized = true;
				} else
					retObj.isCategorized = true;

				if (retObj.isCategorized) {
					retObj.category = categoryCheck;
					retObj.isRecordCustomized = false;
				}
			}
		}

		if (retObj.isCategorized
			|| widgetCustomizationMeta.categoryCheck === this.CATEGORY.CUSTOMIZED) {

			m2mDepsCustObj = _getM2MDetails.call(this, this.TBL.M2M_SP_WID_DEP, this.TYPE.WID_DEP, this.COL.SP_WID, widSysId, custcheck);
			retObj.dependencies = m2mDepsCustObj.dependencies;

			m2mNGProCustObj = _getM2MDetails.call(this, this.TBL.M2M_SP_NG_PRO, this.TYPE.NG_PRO, this.COL.SP_WID, widSysId, custcheck);
			retObj.providers = m2mNGProCustObj.providers;

			m2mTemplCustObj = _getM2MDetails.call(this, this.TBL.SP_NG_TMPL, this.TYPE.NG_TMPL, this.COL.SP_WID, widSysId, custcheck);
			retObj.templates = m2mTemplCustObj.templates;

			if (widgetCustomizationMeta.custCheck) {

				this.TBL.SP_WIDGET = widgetCustomizationMeta.sysClassName;
				this.ENCODED_QUERY_PREVIOUS = widgetCustomizationMeta.firstEncodedQuery;
				this.ENCODED_QUERY_BASELINE = widgetCustomizationMeta.secondEncodedQuery;
				this.ENCODED_QUERY_CURRENT = widgetCustomizationMeta.thirdEncodedQuery;

				recCustObj = _getRecordDetails.call(this, this.TBL.SP_WIDGET, this.TYPE.WIDGET, widSysId, custcheck);
				retObj.isRecordCustomized = recCustObj.isRecordCustomized;

				if (recCustObj.isRecordCustomized) {
					retObj.baselineSysId = recCustObj.baselineSysId;
					retObj.prevSysId = recCustObj.prevSysId;
					retObj.currentSysId = recCustObj.currentSysId;
				}

				// if any of them are customized - widget is customized
				if (recCustObj.isRecordCustomized
					|| m2mDepsCustObj.isCustomized
					|| m2mNGProCustObj.isCustomized
					|| m2mTemplCustObj.isCustomized) {

					retObj.isCategorized = true;
					retObj.category = this.CATEGORY.CUSTOMIZED;
				}
			}
		}
		return retObj;
	},

	type: 'SPWidgetCategorization'
};

function _getM2MDetails(table, type, qcol, recId, custcheck) {

	var recCustObj = {};
	var retObj = {
		widSysId: recId,
		dependencies: [],
		providers: [],
		templates: [],
		isCustomized: false,
		category: this.CATEGORY.UNCATEGORIZED,
	};
	var arrRetObj = [];
	var childTable = '';
	var isCssOrJSCustomized = false;
	var tmpObj;

	var grM2M = new GlideRecord(table);
	grM2M.addQuery(qcol, '=', recId);
	grM2M.query();

	while (grM2M.next()) {

		tmpObj = {};

		if (type === this.TYPE.WID_DEP) {

			tmpObj.sys_id = grM2M.sp_dependency.sys_id.toString();
			tmpObj.name = grM2M.sp_dependency.name.toString();
			childTable = this.TBL.SP_WID_DEP;

		} else if (type === this.TYPE.NG_PRO) {

			tmpObj.sys_id = grM2M.sp_angular_provider.sys_id.toString();
			tmpObj.name = grM2M.sp_angular_provider.name.toString();
			childTable = this.TBL.SP_NG_PRO;

		} else if (type === this.TYPE.NG_TMPL) {

			tmpObj.sys_id = grM2M.getUniqueValue();
			tmpObj.id = grM2M.getValue(this.ID) || '';
			childTable = table;
		}

		if (custcheck) {

			recCustObj = _getRecordDetails.call(this, childTable, type, tmpObj.sys_id, custcheck);

			if (recCustObj.isRecordCustomized) {
				tmpObj.baselineSysId = recCustObj.baselineSysId;
				tmpObj.currentSysId = recCustObj.currentSysId;
				tmpObj.prevSysId = recCustObj.prevSysId;
			}

			if (type !== this.TYPE.NG_TMPL)
				tmpObj.isM2MCustomized = (grM2M.getValue(this.COL.SYS_UPDATED_BY) != this.USR_ADMIN) ? true : false;

			if (type === this.TYPE.WID_DEP)
				isCssOrJSCustomized = _isDepJSORCSSCustomized.call(this, tmpObj.sys_id);

			tmpObj.isRecordCustomized = recCustObj.isRecordCustomized || isCssOrJSCustomized;

			if (!retObj.isCustomized
				&& (tmpObj.isRecordCustomized || tmpObj.isM2MCustomized))
				retObj.isCustomized = true;
		}
		arrRetObj.push(JSON.parse(JSON.stringify(tmpObj)));
	}

	if (type === this.TYPE.WID_DEP)
		retObj.dependencies = arrRetObj;

	else if (type === this.TYPE.NG_PRO)
		retObj.providers = arrRetObj;

	else if (type === this.TYPE.NG_TMPL)
		retObj.templates = arrRetObj;

	return retObj;
}

// Check if the record is customized
function _getRecordDetails (tableName, type, recId, custcheck) {

	var recName = tableName + '_' + recId;
	var retObj = {
		isRecordCustomized: false,
		category: this.CATEGORY.UNCATEGORIZED
	};
	var tmpObj;

	var grTBL = new GlideRecord(this.TBL.SYS_UPDATE_VERSION);
	grTBL.addQuery(this.COL.NAME, '=', recName);
	grTBL.addEncodedQuery(this.ENCODED_QUERY_CURRENT);
	grTBL.addQuery(this.COL.SRC_TBL, '=', this.SYS_UPDATE_SET);
	grTBL.query();

	if (grTBL.next()) {

		if (custcheck) {
			retObj.currentSysId = grTBL.getUniqueValue();
			tmpObj = _getVersionSysIds.call(this, tableName, retObj.currentSysId, recId);
			retObj.baselineSysId = tmpObj.baselineSysId;
			retObj.prevSysId = tmpObj.prevSysId || retObj.currentSysId;
		}

		if (type === this.TYPE.WIDGET)
			retObj.category = this.CATEGORY.CUSTOMIZED;

		else if (type === this.TYPE.WID_DEP)
			retObj.category = this.CATEGORY.CUSTOMIZED_DEP;

		else if (type === this.TYPE.NG_PRO)
			retObj.category = this.CATEGORY.CUSTOMIZED_NG_PRO;

		else if (type === this.TYPE.NG_TMPL)
			retObj.category = this.CATEGORY.CUSTOMIZED_NG_TMPL;

		retObj.isRecordCustomized = true;
	}
	return retObj;
}

// Check if M2M JS or CSS customized
function _isDepJSORCSSCustomized (recId) {

	var isCustomized = false;
	isCustomized = _isDepJSORCSSRecordCustomized.call(this, this.TBL.M2M_SP_JS_INC, recId);

	if (!isCustomized)
		isCustomized = _isDepJSORCSSRecordCustomized.call(this, this.TBL.M2M_SP_CSS_INC, recId);

	return isCustomized;
}

function _isDepJSORCSSRecordCustomized (table, recId) {

	var isCustomized = false;
	var grDepM2M = new GlideRecord(table);
	grDepM2M.addQuery(this.COL.SP_WID_DEP, '=', recId);
	grDepM2M.query();

	while (grDepM2M.next()) {
		if (grDepM2M.getValue(this.COL.SYS_UPDATED_BY) !== this.USR_ADMIN) {
			isCustomized = true;
			break;
		}
	}
	return isCustomized;
}

// Get Version sys_ids
function _getVersionSysIds (tableName, currentSysId, recId) {

	var recName = tableName + '_' + recId;
	var	retObj = {};

	var encodedQueryCommon = this.COL.NAME + '=' + recName;
	var encodedQueryBaseline = encodedQueryCommon + '^' + this.ENCODED_QUERY_BASELINE;
	var encodedQueryPrevious = encodedQueryCommon + '^' + this.ENCODED_QUERY_PREVIOUS;
	var encodedQueryCurrent = encodedQueryCommon + '^' + this.ENCODED_QUERY_CURRENT;

	retObj.baselineSysId = _getVersionSysId.call(this, encodedQueryBaseline);
	retObj.prevSysId = _getVersionSysId.call(this, encodedQueryPrevious);

	if (!currentSysId)
		retObj.currentSysId = _getVersionSysId.call(this, encodedQueryCurrent);
	else
		retObj.currentSysId = currentSysId;

	return retObj;
}

function _getVersionSysId (encodedQuery) {

	var sysId = '';

	var grTBL = new GlideRecord(this.TBL.SYS_UPDATE_VERSION);
	grTBL.orderByDesc(this.COL.SYS_CREATED_ON);
	grTBL.addEncodedQuery(encodedQuery);
	grTBL.query();

	if (grTBL.next())
		sysId = grTBL.getUniqueValue();

	return sysId;
}
```