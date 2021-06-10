---
title: "ContentUpdateAPI"
id: "contentupdateapi"
---

API Name: global.ContentUpdateAPI

```js
var ContentUpdateAPI = Class.create();

ContentUpdateAPI.STEP = 'Processing ';
ContentUpdateAPI.STATUS_SUCCESS = 'SUCCESS';
ContentUpdateAPI.STATUS_FAILURE = 'FAILURE';
ContentUpdateAPI.CDS_SCHEDULE_TABLE = 'cds_client_schedule';

ContentUpdateAPI.prototype = {
	
    initialize: function(params) {
		this.jobParams = {
			jobName: '',
			propertyTableName: '',
			keyLastRunDate: '',
			jobLogMessage: '',
			contentTables: [],
			contentTablesHandlers: {},
			onPremTracker: '',
		};
			
		this.setProperties(params);
		
		// Fetching the last run date to initialize the date effective clause
		this.initializeLastRunDate();
		
		// Initializing job log util
		this.jobLogUtil = new AssetJobLogUtil();
    },
	
	setProperties: function(params) {
		this.jobParams = {
			jobName: params.jobName,
			propertyTableName: params.propertyTableName,
			keyLastRunDate: params.keyLastRunDate,
			jobLogMessage: params.jobLogMessage,
			contentTables: params.contentTables,
			contentTablesHandlers: params.contentTablesHandlers,
			onPremTracker: params.onPremTracker,
		};
	},
	
	initializeLastRunDate: function() {
		this.now = new GlideDateTime();
		var prevRunDate;
		var currValue;
		// Query the properties table to get the last successful run date for the date effective clause
		new GlideQuery(this.jobParams.propertyTableName)
			.getBy({key: this.jobParams.keyLastRunDate}, ['value'])
			.ifPresent(function(u) {
				currValue = u['value'];
			});
		if (!gs.nil(currValue)) {
			prevRunDate = new GlideDateTime(currValue);
			this.dateEffectiveClause = 'sys_updated_onBETWEEN' + prevRunDate + '@' + this.now;
		}
	},
	
	runJob: function() {
		this.jobLogUtil.startJobLog(this.jobParams.jobLogMessage);
		try {
			// Check if the CDS pull has happened for the content tables
			if (this.isCDSPullCompleted()) {
				
				// Process Content updates per table
				this.jobParams.contentTables.forEach(function(table) {
					this.processTable(table);
				}.bind(this));

				// Stop job log
				this.jobLogUtil.stopJobLog(this.jobLogUtil.COMPLETED_STATUS, 'Updates Processed'); 
				this.updateLastRunDateProperty();
			}
			else{
				this.jobLogUtil.stopJobLog(this.jobLogUtil.FAILED_STATUS, this.jobParams.jobName+' job aborted as CDS pull has not happened for all tables');
			}

		} catch (error) {
			// Capture error in job log
			this.jobLogUtil.stopJobLog(this.jobLogUtil.FAILED_STATUS, error.message);
		}
	},
	
	processTable: function(table) {
		// Job step logging
		this.jobLogUtil.startJobStep(ContentUpdateAPI.STEP + table);

		var dupGr;
	
		var contentRecord = new GlideRecord(table);
		if (contentRecord.isValid()) {
			
			// Add query on sys_class_name so that records from child(custom) tables will not be included
			if(contentRecord.isValidField('sys_class_name')) {
				contentRecord.addQuery('sys_class_name', table);
			}
			// Update else condition to handle sam tables
  
			//Get the records which were modififed after the last run date
			if (!gs.nil(this.dateEffectiveClause)) {
				contentRecord.addEncodedQuery(this.dateEffectiveClause);
			}
			
			contentRecord.query();
			if (contentRecord.hasNext()) {
				// Instantiate handler class
				// hwnorm2hamp var handler = new global[this.jobParams.contentTablesHandlers[table]];
				var handler;
				if (this.jobParams.contentTablesHandlers[table].startsWith('HAM')) {
					handler = new sn_hamp[this.jobParams.contentTablesHandlers[table]];
				} else {
					handler = new global[this.jobParams.contentTablesHandlers[table]];
				}
			}

			while (contentRecord.next()) {
				try {
					dupGr = new GlideRecord(table);
					dupGr.get(contentRecord.getUniqueValue());
					handler.process(dupGr);
				} catch (error) {
					this.jobLogUtil.stopJobStep(ContentUpdateAPI.STEP + table, 'Error while processing record ' + contentRecord.getUniqueValue() + ' : ' + error.message);
					throw error;
				}
			}
			this.jobLogUtil.stopJobStep(ContentUpdateAPI.STEP + table, 'Completed');
		}
	},
	
	updateLastRunDateProperty: function() {
		new GlideQuery(this.jobParams.propertyTableName)
			.where('key', this.jobParams.keyLastRunDate)
			.updateMultiple({
				value: this.now.getValue()
			});
	},

	isCDSPullCompleted: function() {
		var query = new GlideQuery(ContentUpdateAPI.CDS_SCHEDULE_TABLE)
			.where('table.table', 'IN', this.jobParams.contentTables)
			.whereNull('last_updated_on')
			.limit('1')
			.select('table')
			.toArray(1);

		if (query.length === 1) {
			// On-prem case check
			var onpremquery = new GlideQuery(this.jobParams.onPremTracker)
			.where('content_type', 'import')
			.where('status', 'successfully_imported')
			.limit(1)
			.select('status')
			.toArray(1);
			if(onpremquery.length === 1)
				return true;
			else
				return false;
		}
		return true;
	},

    type: 'ContentUpdateAPI'
};
```