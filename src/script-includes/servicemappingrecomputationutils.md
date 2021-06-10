---
title: "ServiceMappingRecomputationUtils"
id: "servicemappingrecomputationutils"
---

API Name: global.ServiceMappingRecomputationUtils

```js
var ServiceMappingRecomputationUtils = Class.create();
ServiceMappingRecomputationUtils.prototype = {
    initialize: function() {
		this.PREFIX = 'Service Mapping Recomputation';
		this.SCRIPT = 'SNC.ServiceMappingFactory.recompute();';
		this.PREFIX_FAST = 'Service Mapping Fast Recomputation';
		this.SCRIPT_FAST = 'SNC.ServiceMappingFactory.recompute(true);';
    },
	
	removeScheduledJobs: function() {
		this.removeRecompScheduledJobs(this.PREFIX);
	},
	
	removeFastScheduledJobs: function() {
		this.removeRecompScheduledJobs(this.PREFIX_FAST);		
	},
	
	removeRecompScheduledJobs: function(jobName) {
		var triggerGr = this._getSchedulerRecord();
		triggerGr.addQuery('name', 'STARTSWITH', jobName);
		triggerGr.query();
		triggerGr.deleteMultiple();
	},
	
	deployScheduledJobs: function(jobCount) {
	    var jobPriority = gs.getProperty('glide.service_mapping.recomputation_job_priority', 150);			
		var enableMultiNode = gs.getProperty('glide.service_mapping.recomputation.multi_node_enabled', true);
		this.deployRecompScheduledJobs(jobCount, jobPriority, enableMultiNode, this.PREFIX, this.SCRIPT);
	},
	
	deployFastScheduledJobs: function(jobCount) {
		var jobPriority = gs.getProperty('glide.service_mapping.fast_recomputation_job_priority', 150);			
		var enableMultiNode = gs.getProperty('glide.service_mapping.fast_recomputation.multi_node_enabled', true);
		this.deployRecompScheduledJobs(jobCount, jobPriority, enableMultiNode, this.PREFIX_FAST, this.SCRIPT_FAST);
	},
	
	deployRecompScheduledJobs: function(jobCount, jobPriority, enableMultiNode, jobName, script) {
		var isWorkflowEnabled = gs.getSession().getWorkflow();
		var interval = this._calculateInterval(jobCount);
		
		var logMessage = 'About to deploy ' + jobCount + ' ' + jobName + ' jobs with priority ' + jobPriority + ', interval ' + interval + '(ms)';
		if (enableMultiNode)
			logMessage += ' on all active nodes';
		
		gs.log(logMessage);
		
		var when = new GlideDateTime();
		var triggerGr = this._getSchedulerRecord();
		for (var i = 1 ; i <= jobCount ; i++) {
			triggerGr.initialize();
			var name = jobName;
			if (jobCount > 1)
				name +=' ' + i;

			gs.log('About to deploy scheduled job ' + name);

			triggerGr.setValue('name', name);
			if (enableMultiNode == 'true')
				triggerGr.setValue('system_id', 'ACTIVE NODES');
			triggerGr.setValue('priority', jobPriority);
			triggerGr.setValue('trigger_type', 1); // REPEAT
			triggerGr.setValue('state', 0); // READY
			var duration = new GlideDuration(interval);
			triggerGr.setValue('repeat', duration);
			triggerGr.setValue('next_action', when);
			triggerGr.setValue('script', script);
			triggerGr.insert();

			// In case workflow is disabled, we need to propagate nodes for the scheduled job
			if (enableMultiNode == 'true' && !isWorkflowEnabled) {
				var s = new Scheduler();
				s.propagateRANodesForTrigger(triggerGr);
			}
			
			when.addSeconds(1);
		}
	},
	
	defaultJobCount: function() {
		var workers = gs.getProperty('glide.sys.schedulers', 8);
		var jobCount = parseInt(Math.floor(workers / 2));
		return Math.min(2, jobCount);
	},
	
	_calculateInterval: function(jobCount) {
		var interval = jobCount * 1000;
		var minInterval = 5000; // At least 5 seconds interval between jobs
		if (interval < minInterval)
			interval = minInterval;
		
		return interval;
	},
	
	_getSchedulerRecord: function() {
		return new GlideRecord('sys_trigger');
	},

    type: 'ServiceMappingRecomputationUtils'
};
```