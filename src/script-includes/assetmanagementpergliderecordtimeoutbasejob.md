---
title: "AssetManagementPerGlideRecordTimeoutBaseJob"
id: "assetmanagementpergliderecordtimeoutbasejob"
---

API Name: global.AssetManagementPerGlideRecordTimeoutBaseJob

```js
var AssetManagementPerGlideRecordTimeoutBaseJob = Class.create();
AssetManagementPerGlideRecordTimeoutBaseJob.prototype = Object.extendsObject(
	global.AssetManagementPerGlideRecordBaseJob, {
		initialize: function() {
			this.timeoutFlag = false;
		},

		setTimeoutFlag: function(value) {
			this.timeoutFlag = value;
		},

		runJob: function() {
			if (!this.timeoutFlag) {
				var records = this.getRecords();
				var isFailed = false;
				if (this.fIsDomainDataSeparationEnabled && records.isValidField(this.getSysDomainFieldName())) {
					records.addQuery(this.getSysDomainFieldName(), this.getCurrentDomainSysId());
					records.query();
				}
				while (records.next() && !this.timeoutFlag) {
					try {
						this.runJobForRecord(records);
					} catch (e) {
						isFailed = true;
						gs.logError(this.type + ': ' + e);
					}
				}
				if (isFailed) {
					throw new Error(this.type + ': Failed to run job. Please look into logs for more details.');
				}
			}
		},

		type: 'AssetManagementPerGlideRecordTimeoutBaseJob',
	}
);
```