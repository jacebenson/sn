---
title: "AssetQueueProcessor"
id: "assetqueueprocessor"
---

API Name: global.AssetQueueProcessor

```js
var AssetQueueProcessor = Class.create();
AssetQueueProcessor.prototype = Object.extendsObject(global.AssetManagementPerGlideRecordTimeoutBaseJob, {
	initialize: function(jobLog) {
		this.comments = {
			TOTAL_RECORDS: 0,
			ASSET_CREATED: 0,
			ASSET_SKIPPED: 0,
			CI_NEEDS_VERIFICATION: 0,
			CI_DELETED: 0,
			CI_ERROR: 0,
			NOT_SUPPORTED: 0,
		};
		this.CIClasses = [];
		this.nonSupportedClasses = ['cmdb_ci'];
		this.timeoutPeriod = this._getJobTimeoutPeriod();
		this.stopWatch = new GlideStopWatch();
		this.C_BATCH_SIZE = 200;
		this.recordCount = 0;
		this.assetCIAPI = new AssetandCI();
		this.jobLog = jobLog;
	},

	_getJobTimeoutPeriod: function() {
		// Time in minutes
		var C_DEFAULT_TIMEOUT = 13;
		var C_MINIMUM_TIMEOUT = 1;
		var C_MAXIMUM_TIMEOUT = 60;
		var timeout = C_DEFAULT_TIMEOUT;
		var propertyValue;
		var assetProperty = new GlideRecord(AssetandCI.ASSET_PROPERTY);
		if (assetProperty.get('key', AssetandCI.ASYNC_JOB_TIMEOUT_PROPERTY)) {
			propertyValue = Number(assetProperty.getValue('value'));
			if (propertyValue >= C_MINIMUM_TIMEOUT && propertyValue <= C_MAXIMUM_TIMEOUT) {
				timeout = propertyValue;
			}
		}
		// Converting minutes to milliseconds
		return timeout * 60 * 1000;
	},

	_isCIRecord: function(table) {
		if (this.nonSupportedClasses.indexOf(table) > -1) {
			return false;
		}
		if (!this.CIClasses.indexOf(table) > -1) {
			var tableUtil = new TableUtils(table);
			var arrayUtils = new ArrayUtil();
			var tableArray = arrayUtils.convertArray(tableUtil.getTables());
			var tables = tableArray.toString().split(',');
			if (tables.indexOf('cmdb_ci') > -1) {
				this.CIClasses.push(table);
			} else {
				this.nonSupportedClasses.push(table);
				return false;
			}
		}
		return true;
	},

	_processAssetQueueRecord: function(assetQueueGr) {
		var ciGr;
		var result;
		this.comments.TOTAL_RECORDS += 1;
		try {
			if (!this._isCIRecord(assetQueueGr.getValue(AssetandCI.ASSET_CREATION_QUEUE.TABLE_COLUMN))) {
				this.comments.NOT_SUPPORTED += 1;
			} else {
				ciGr = new GlideRecord(assetQueueGr.getValue(AssetandCI.ASSET_CREATION_QUEUE.TABLE_COLUMN));
				if (!ciGr.get(assetQueueGr.getValue(AssetandCI.ASSET_CREATION_QUEUE.DOCUMENT_ID_COLUMN))) {
					this.comments.CI_DELETED += 1;
				} else {
					result = this.assetCIAPI.createAssetByPass(ciGr, true);
					switch (result.status) {
					case AssetandCI.RESULT_STATUS.ASSET_CREATED:
					{
						this.comments.ASSET_CREATED += 1;
						// Avoid additonal sync action between CI and Asset
						ciGr.skip_sync = true;
						ciGr.update();
						break;
					}
					case AssetandCI.RESULT_STATUS.ASSET_SKIPPED:
					{
						this.comments.ASSET_SKIPPED += 1;
						break;
					}
					case AssetandCI.RESULT_STATUS.CI_NEEDS_VERIFICATION:
					{
						this.comments.CI_NEEDS_VERIFICATION += 1;
						// Avoid additonal sync action between CI and Asset
						ciGr.skip_sync = true;
						ciGr.update();
						break;
					}
					case AssetandCI.RESULT_STATUS.CI_ERROR:
					{
						throw new Error(result.comments);
					}
					default:
					{
						throw new Error('Inavlid result');
					}
					}
				}
			}
			assetQueueGr.deleteRecord();
		} catch (error) {
			this.comments.CI_ERROR += 1;
			assetQueueGr.setValue(AssetandCI.ASSET_CREATION_QUEUE.STATE_COLUMN, 'error');
			assetQueueGr.setValue(AssetandCI.ASSET_CREATION_QUEUE.COMMENTS_COLUMN, error.message);
			assetQueueGr.update();
		}
	},

	getRecords: function() {
		var assetQueueGr = new GlideRecord(AssetandCI.ASSET_CREATION_QUEUE.TABLE);
		assetQueueGr.addQuery(AssetandCI.ASSET_CREATION_QUEUE.STATE_COLUMN, 'ready');
		assetQueueGr.query();
		return assetQueueGr;
	},

	getDomains: function() {
		return this.getDomainsGeneric();
	},

	runJobForRecord: function(assetQueueGr) {
		this._processAssetQueueRecord(assetQueueGr);
		this.recordCount += 1;
		if (this.recordCount >= this.C_BATCH_SIZE) {
			this.recordCount = 0;
			if (this.stopWatch.getTime() > this.timeoutPeriod) {
				this.setTimeoutFlag(true);
			}
		}
	},

	generateComments: function() {
		var comments = this.comments;
		return Object.keys(comments).reduce(function(accumulator, key) {
			return (accumulator + key.toUpperCase() + ': ' + comments[key] + '\n');
		}, '');
	},

	type: 'AssetQueueProcessor',
});
```