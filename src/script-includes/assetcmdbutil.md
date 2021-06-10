---
title: "AssetCMDBUtil"
id: "assetcmdbutil"
---

API Name: global.AssetCMDBUtil

```js
var AssetCMDBUtil = Class.create();
AssetCMDBUtil.prototype = {
	initialize: function() {
		this.jsonApi = new global.JSON();
		this.cmdbApi = SNC.IdentificationEngineScriptableApi;
	},

	isSerialNumberMandatory: function(modelCategory) {
		if (gs.getProperty(AssetCMDBUtil.ASSET_IRE_PROPERTY) === 'true') {
			var modelCategoryGr = new GlideRecord('cmdb_model_category');
			if (modelCategoryGr.get(modelCategory)) {
				var ciClass = modelCategoryGr.getValue('cmdb_ci_class');
				if (!gs.nil(ciClass)) {
					var res = SNC.CmdbMetadataScriptableApi.hasSerialNumberRuleWithNoRelationship(ciClass);
					return res;
				}
			}
		}
		return false;
	},

	getMatchRuleInfo: function(attempts) {
		var matchRuleInfo = {};
		var attempt;
		if (gs.nil(attempts)) {
			return matchRuleInfo;
		}
		for (var element in attempts) {
			attempt = attempts[element];
			if (attempt.attemptResult === 'MATCHED') {
				matchRuleInfo.identifier = !gs.nil(attempt.identifierName) ? attempt.identifierName : '';
				matchRuleInfo.table = !gs.nil(attempt.searchOnTable) ? attempt.searchOnTable : '';
				matchRuleInfo.attributes = !gs.nil(attempt.attributes) ? attempt.attributes.join(', ') : '';
				break;
			}
		}
		return matchRuleInfo;
	},

	parseIDResult: function(result) {
		var idResultObj = {
			success: false,
			insert: false,
			sysId: null,
			className: null,
			attempts: [],
			matchedRule: {},
			errors: [],
		};

		if (JSUtil.nil(result) || JSUtil.nil(result.items) || !result.items.length || result.items.length > 1) {
			return idResultObj;
		}

		// There should be only one item returned
		var item = result.items[0];

		if (item.errors) {
			idResultObj.errors = item.errors;
			return idResultObj;
		}

		idResultObj.success = true;
		idResultObj.insert = item.operation === 'INSERT';
		idResultObj.matchedRule = this.getMatchRuleInfo(item.identificationAttempts);
		idResultObj.sysId = !gs.nil(item.sysId) ? item.sysId : null;
		idResultObj.className = item.className;
		idResultObj.attempts = item.identificationAttempts;

		return idResultObj;
	},

	checkInsertOrUpdate: function(input) {
		var result = this.jsonApi.decode(this.cmdbApi.identifyCI(input));
		return this.parseIDResult(result);
	},

	insertOrUpdate: function(source, input) {
		var result = this.jsonApi.decode(this.cmdbApi.createOrUpdateCI(source, input));
		return this.parseIDResult(result);
	},

	createCIUsingIRE: function(ci) {
		var ciJSON = {};
		var columnName;
		var fields = ci.getFields();
		for (var num = 0; num < fields.size(); num++) {
			columnName = fields.get(num).getName();
			if (columnName.indexOf('sys_') !== 0 && ci[columnName].changes()) {
				ciJSON[columnName] = ci.getValue(columnName);
			}
		}

		var payload = {
			items: [{
				className: ci.getTableName(),
				values: ciJSON,
			}],
		};
		var input = this.jsonApi.encode(payload);

		var ciSysId;
		var checkResult = this.checkInsertOrUpdate(input);
		if (!checkResult.success) {
			throw new Error(gs.getMessage('CMDB Identification Error occured during creation of CI'));
		}
		if (checkResult.success && !checkResult.insert && checkResult.sysId) {
			var link = '<a href=/cmdb_ci.do?sys_id=' + checkResult.sysId + '>Configuration Item</a>';
			var msg = gs.getMessage('Duplicate Entry - Matching {0} found', link);
			throw new Error(msg);
		} else {
			var insertOrUpdateResult = this.insertOrUpdate(AssetCMDBUtil.DISCOVERY_SOURCE, input);
			if (!insertOrUpdateResult.success) {
				throw new Error(gs.getMessage('CMDB Identification Error occured during creation of CI'));
			}
			if (insertOrUpdateResult.success && JSUtil.notNil(insertOrUpdateResult.sysId)) {
				ciSysId = insertOrUpdateResult.sysId;
			}
		}
		return ciSysId;
	},

	type: 'AssetCMDBUtil',
};
AssetCMDBUtil.ASSET_IRE_PROPERTY = 'glide.asset.create_ci_with_ire';
AssetCMDBUtil.DISCOVERY_SOURCE = 'SNAssetManagement';
```