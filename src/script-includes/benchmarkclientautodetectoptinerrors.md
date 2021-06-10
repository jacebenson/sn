---
title: "BenchmarkClientAutoDetectOptInErrors"
id: "benchmarkclientautodetectoptinerrors"
---

API Name: sn_bm_client.BenchmarkClientAutoDetectOptInErrors

```js
var BenchmarkClientAutoDetectOptInErrors = Class.create();
BenchmarkClientAutoDetectOptInErrors.prototype = {
	EXPECTED_PA_COUNT : 2,
	PA_BY_MONTH_SUM : '80e19051d7001100ba986f14ce610320',
	PA_BY_MONTH_AVG : 'cdbd2851d7001100ba986f14ce6103a3',
	
    initialize: function() {
    },
	
	
	getConfiguration : function () {
		var result = {count: 0, opted_in: false};
		var gr = new GlideRecordSecure('sn_bm_client_configuration');
		gr.query();

		result.count = gr.getRowCount();
		while (gr.next()) {
			if (gr.getValue('name') == 'opt_in_status' && gr.getValue('value') == 'true')
				result.opted_in = true;
		}

		return result;
	},
	
	areConfigurationFieldsAvailable : function () {
		if ( this.getConfigurationField('opt_in_datetime') &&
			this.getConfigurationField('opt_in_status') &&
			this.getConfigurationField('opt_out_datetime') &&
			this.getConfigurationField('opt_out_feedback') ) {
			return true;	
		}
		return false;
	},
	
	getConfigurationField : function(fieldName) {
		var gr = new GlideRecordSecure('sn_bm_client_configuration');
		gr.addQuery('name', fieldName);
		gr.query();
		if ( gr.getRowCount () == 1 )
			return true;

		return false;
	},
	
	isExpectedPAAggregateCount : function () {
		return  this.EXPECTED_PA_COUNT == this.getPAAggregatesCount();
	},

	getPAAggregatesCount : function () {
		var pa = new GlideRecord('pa_aggregates');
		pa.addQuery('sys_id', 'IN', [this.PA_BY_MONTH_SUM, this.PA_BY_MONTH_AVG]);
		pa.query();
		return pa.getRowCount();
	},

	checkIfUserProfileExists : function () {
		return this.getRecordCount('sn_bm_client_user_profile') > 0;
	},
	
	checkIfInstanceCredentialsExist : function () {
		return !gs.getProperty('sn_apprepo.credential');
	},
	
	getPAMaxRecordsProperty : function () {
		return gs.getProperty('com.snc.pa.dc.max_records');
	},
	
	getRecordCount : function (table) {
		var ga = new GlideAggregate(table);
		ga.addAggregate('COUNT');
		ga.setGroup(false);
		ga.query();
		return ga.next() ? ga.getAggregate('COUNT') : 0;
	},
	
	getBMUserStatus : function () {
		var result = {exists: false, active: false, locked: true};
		var gr = new GlideRecord('sys_user');
		if (!gr.get('user_name', 'bm.scheduler'))
			return result;

		result.exists = true;
		result.active = gr.getValue('active') == '1';
		result.locked = gr.getValue('locked_out') == '1';
		return result;
	},
	
	checkIfPAJobsAreActive : function () {
		var gr = new GlideRecord('sysauto_pa');
		gr.addActiveQuery();
		gr.addQuery('benchmarking', true);
		gr.query();
		return gr.getRowCount();
	},
	
	getPAJobLogAggregates : function () {
		var result = {};
		var gr = new GlideAggregate('pa_job_logs');
		gr.addQuery('job.benchmarking', true);
		gr.groupBy('job');
		gr.addAggregate('SUM', 'errors');
		gr.addAggregate('SUM', 'inserts');
		gr.addAggregate('SUM', 'deletes');
		gr.addAggregate('SUM', 'warnings');
		gr.query();

		while (gr.next()) {
			var job = gr.getValue('job') + '';
			result[job] = {
				errors: gr.getAggregate('SUM', 'errors'),
				inserts: gr.getAggregate('SUM', 'inserts'),
				deletes: gr.getAggregate('SUM', 'deletes'),
				warnings: gr.getAggregate('SUM', 'warnings') 
			};
		}

		return result;
	},
	
	autoDetectErrors : function () {
		var result = {
			config: this.getConfiguration(),
			pa_aggregates: this.isExpectedPAAggregateCount(),
			user_profile: this.checkIfUserProfileExists(),
			credentials: this.checkIfInstanceCredentialsExist(),
			pa_max_records: this.getPAMaxRecordsProperty(),
			bm_user: this.getBMUserStatus(),
			pa_jobs: this.checkIfPAJobsAreActive(),
			pa_logs: this.getPAJobLogAggregates(),
			configuration_fields : this.areConfigurationFieldsAvailable()
		};
		var resultEncoded = JSON.stringify(result);
		return resultEncoded;
			
	},

    type: 'BenchmarkClientAutoDetectOptInErrors'
};
```