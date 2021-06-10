---
title: "SLAAsyncDelegatorSNC"
id: "slaasyncdelegatorsnc"
---

API Name: global.SLAAsyncDelegatorSNC

```js
var SLAAsyncDelegatorSNC = Class.create();
SLAAsyncDelegatorSNC.prototype = {
	SLA_ASYNC_MUTEX_NAME: 'SLAAsyncDelegator',
	SLA_ASYNC_JOB_LIMIT: 'com.snc.sla.async.job.limit',
	SLA_ASYNC_JOB_PRIORITY: 'com.snc.sla.async.job.priority',
	SLA_ASYNC_JOB_CLAIM_LIMIT_MIN: 'com.snc.sla.async.job.claim_limit.min',
	SLA_ASYNC_JOB_CLAIM_LIMIT_MAX: 'com.snc.sla.async.job.claim_limit.max',
	SLA_ASYNC_DELEGATOR_LOG: 'com.snc.sla.async.delegator.log',

	DEFAULT_JOB_PRIORITY: 100,
	DEFAULT_JOB_LIMIT: 4,
	DEFAULT_JOB_CLAIM_LIMIT_MIN: 20,
	DEFAULT_JOB_CLAIM_LIMIT_MAX: 20,
	DEFAULT_READY_QUERY_LIMIT: 1000,

    initialize: function() {
		this.jobs = [];
		this.jobData = null;
		this.belowMinJobNumber = null;
		this.availableJobNumbers = [];
		this._initJobLimits();
		this.lu = new GSLog(this.SLA_ASYNC_DELEGATOR_LOG, this.type);
		this.lu.includeTimestamp();
    },

	process: function() {
		var startTime;
		var endTime;

		if (this.lu.atLevel(GSLog.DEBUG)) {
			this.lu.logDebug("process: starting");
			startTime = new GlideDateTime();
		}

		/* First thing to do is set back to "ready" any records with a state of "queued" or "processing" but do not have an SLA Async Job
		   Records with these values will never be processed again so need to be updated back to "ready"
		   
		   An example of when this can happen is if a node is restarted while an SLA Async job is running */
		this._recoverStuckRecords();

		this.jobData = this._getJobData();

		var slaAsyncJobs = this.jobData.slaAsyncJobs;
		var existingJobCount = Object.keys(slaAsyncJobs).length;

		if (existingJobCount >= this.jobLimit) {
			if (this.lu.atLevel(GSLog.WARN))
				this.lu.logWarn("process: there are already " + existingJobCount + " jobs running to process the records in the \"" +
								SLAAsyncSNC.SLA_ASYNC_QUEUE + " table (Job limit is: " + this.jobLimit + ")");

			return;
		}

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("process: data retrieved for currently running jobs:\n" + JSON.stringify(this.jobData));

		this.jobLimit = this.jobLimit - existingJobCount;

		// Get the query for all SLA Async records that are ready to be given to jobs for processing
		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("process: query \"" + SLAAsyncSNC.SLA_ASYNC_QUEUE + "\" table for records that are ready for processing:\n");

		var slaAsyncQueueGr = this._getReadyQueue();
		if (slaAsyncQueueGr.hasNext())
			SelfCleaningMutex.enterCriticalSectionRecordInStats(this.SLA_ASYNC_MUTEX_NAME, this.SLA_ASYNC_MUTEX_NAME, this, this._process, slaAsyncQueueGr);
		else if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("process: thare are no ready records to be delegated");

		if (this.lu.atLevel(GSLog.DEBUG)) {
			endTime = new GlideDateTime();
			this.lu.logDebug("process: finished - processing duration " + (endTime.getNumericValue() - startTime.getNumericValue()) + "ms");
		}
	},

	_process: function(slaAsyncQueueGr) {
		var jobNumber;
		var currentJobNumber;
		var jobQueue;
		var queuedTasks = {};

		// We run the query again just in case another process acquired the mutex before us and things have changed...
		slaAsyncQueueGr.query();

		if (!slaAsyncQueueGr.hasNext()) {
			if (this.lu.atLevel(GSLog.DEBUG))
				this.lu.logDebug("_process: thare are no ready records to be delegated");

			return;
		}

		while (slaAsyncQueueGr.next()) {
			var documentId = slaAsyncQueueGr.getValue("document_id");
			// This task is already being processed or in the queue of a job that is already running so we have to leave it alone
			if (this.jobData.queuedTasks[documentId]) {
				if (this.lu.atLevel(GSLog.INFO))
					this.lu.logInfo("_process: record " + slaAsyncQueueGr.getDisplayValue() + " and sequence " + slaAsyncQueueGr.getValue("sequence") +
									" cannot be queued as it is currently being processed or in the queue of an existing job");
				continue;
			}

			jobNumber = null;

			// If we've already allocated this task to a job number then give it to the same job if it's not reached the maximum
			currentJobNumber = queuedTasks[documentId];
			if (currentJobNumber !== undefined) {
				if (this.availableJobNumbers.indexOf(currentJobNumber) >= 0) {
					jobNumber = currentJobNumber;
					if (this.lu.atLevel(GSLog.DEBUG))
						this.lu.logDebug("_process: documentId " + documentId + " already has updates allocated to job number " + jobNumber);
				} else {
					if (this.lu.atLevel(GSLog.INFO))
						this.lu.logInfo("_process: queued record for " + slaAsyncQueueGr.getDisplayValue() + " and sequence " + slaAsyncQueueGr.getValue("sequence") +
										" cannot be delegated as the job allocated for this task has reached the maximum");
				}
			} else {
				jobNumber = this._getNextJobNumber();
				if (jobNumber === null) {
					if (this.lu.atLevel(GSLog.INFO))
						this.lu.logInfo("_process: there are no more jobs available to delegate records to for record with document_id=" +
										documentId + " and sequence=" + slaAsyncQueueGr.getValue("sequence"));
					break;
				}
			}

			// We shouldn't ever get to here with a null jobNumber but just in case
			if (jobNumber === null)
				continue;

			jobQueue = this.jobs[jobNumber];
			// Check that the job number is an array
			if (!Array.isArray(jobQueue))
				continue;

			jobQueue.push(slaAsyncQueueGr.getUniqueValue());
			queuedTasks[documentId] = jobNumber;
			if (this.lu.atLevel(GSLog.INFO))
				this.lu.logInfo("_process: record for " + slaAsyncQueueGr.getDisplayValue() + " and sequence " + slaAsyncQueueGr.getValue("sequence") +
								" has been delegated to job number " + jobNumber);

			// if this queue has reached the minimum limit remove it from the below min variable
			if (jobQueue.length >= this.jobClaimLimitMin)
				this.belowMinJobNumber = null;

			// if this queue has reached the maximum limit remove it from the available jobs
			if (jobQueue.length >= this.jobClaimLimitMax) {
				var indexOfJobNumber = this.availableJobNumbers.indexOf(jobNumber);
				if (indexOfJobNumber >= 0)
					this.availableJobNumbers.splice(indexOfJobNumber, 1);
			}
		}

		// Now we can create the sys_trigger records to process the queued records
		var sysTriggerGr;
		for (var i = 0, n = this.jobs.length; i < n; i++) {
			sysTriggerGr = this._createTrigger();
			if (!sysTriggerGr)
				continue;

			this._allocateRecordsToTrigger(sysTriggerGr, this.jobs[i]);
			sysTriggerGr.setValue("trigger_type", "0");
			sysTriggerGr.update();
		}
	},

	_initJobLimits: function() {
		this.jobLimit = parseInt(gs.getProperty(this.SLA_ASYNC_JOB_LIMIT, null), 10);
		if (isNaN(this.jobLimit))
			this.jobLimit = this.DEFAULT_JOB_LIMIT;

		this.jobPriority = parseInt(gs.getProperty(this.SLA_ASYNC_JOB_PRIORITY, null), 10);
		if (isNaN(this.jobPriority))
			this.jobPriority = this.DEFAULT_JOB_PRIORITY;

		this.jobClaimLimitMin = parseInt(gs.getProperty(this.SLA_ASYNC_JOB_CLAIM_LIMIT_MIN, null), 10);
		if (isNaN(this.jobClaimLimitMin))
			this.jobClaimLimitMin = this.DEFAULT_JOB_CLAIM_LIMIT_MIN;

		this.jobClaimLimitMax = parseInt(gs.getProperty(this.SLA_ASYNC_JOB_CLAIM_LIMIT_MAX, null), 10);
		if (isNaN(this.jobClaimLimitMax))
			this.jobClaimLimitMax = this.DEFAULT_JOB_CLAIM_LIMIT_MAX;
	},

	_getJobData: function() {
		var slaAsyncJobs = {};
		var queuedTasks = {};

		var slaAsyncQueueGr = new GlideAggregate(SLAAsyncSNC.SLA_ASYNC_QUEUE);
		slaAsyncQueueGr.addQuery("state", "IN", "queued,processing");
		slaAsyncQueueGr.groupBy("document_id");
		slaAsyncQueueGr.groupBy("sys_trigger");
		slaAsyncQueueGr.query();

		var slaAsyncJob;
		var slaAsyncJobId;
		while (slaAsyncQueueGr.next()) {
			slaAsyncJobId = slaAsyncQueueGr.getValue("sys_trigger");
			queuedTasks[slaAsyncQueueGr.getValue("document_id")] = slaAsyncJobId;
			slaAsyncJobs[slaAsyncJobId] = true;
		}

		return {slaAsyncJobs: slaAsyncJobs, queuedTasks: queuedTasks};
	},

	/* Queries the queue table for records that need to be allocated to jobs excluding any records
	   for Tasks that already have records allocated to jobs for processing
	   The "setLimit" is there to prevent a slow query in the event that the queue table contains
	   a large number of ready records
	*/
	_getReadyQueue: function() {
		var queryLimit = this._getReadyQueueQueryLimit();

		var slaAsyncQueueGr = new GlideRecord(SLAAsyncSNC.SLA_ASYNC_QUEUE);
		slaAsyncQueueGr.addQuery("state", "ready");
		slaAsyncQueueGr.addNullQuery("sys_trigger");
		slaAsyncQueueGr.addQuery("document_id", "NOT IN", Object.keys(this.jobData.queuedTasks));
		slaAsyncQueueGr.orderBy("sequence");
		slaAsyncQueueGr.setLimit(queryLimit);
		slaAsyncQueueGr.query();

		if (this.lu.atLevel(GSLog.DEBUG))
			this.lu.logDebug("_getReadyQueue: \"" + SLAAsyncSNC.SLA_ASYNC_QUEUE + "\" queried with limit " + queryLimit);

		return slaAsyncQueueGr;
	},

	/* Provides the limit on the number of records queried from the SLA async queue
	   Calculated as the number of jobs multiplied by the number of records that can be allocated to each job.
	   The additional multiplication is to allow for a situation where we have a number of records all for the same
	   Task - by doubling the query limit we give the query more of a chance to return some records that we can
	   delegate out for processing
	*/
	_getReadyQueueQueryLimit: function() {
		var queryLimit = this.jobLimit * this.jobClaimLimitMax * 2;
		if (isNaN(queryLimit))
			return this.DEFAULT_READY_QUERY_LIMIT;
		
		return queryLimit;
	},

	_getNextJobNumber: function() {
		// if we've got a job that is below the minimum queue limit use it
		if (this.belowMinJobNumber !== null)
			return this.belowMinJobNumber;

		// If we haven't reached the limit of jobs, create a new one and return it
		if (this.jobs.length < this.jobLimit) {
			this.jobs.push([]);
			this.availableJobNumbers.push(this.jobs.length - 1);
			this.belowMinJobNumber = this.jobs.length - 1;
			return this.belowMinJobNumber;
		}

		if (this.availableJobNumbers.length === 0)
			return null;

		// Otherwise, from our available jobs, find the one with the least records allocated to it
		var jobNumber = null;
		var availableJobNumber;
		var minQueueLength = Infinity;
		var queueLength;
		for (var i = 0, n = this.availableJobNumbers.length; i < n; i++) {
			availableJobNumber = this.availableJobNumbers[i];
			queueLength = this.jobs[jobNumber].length;
			if (queueLength === undefined)
				continue;
			if (queueLength < minQueueLength) {
				jobNumber = availableJobNumber;
				minQueueLength = queueLength;
			}
		}

		// Return a job from the jobs we've got available
		return jobNumber;
	},

	_createTrigger: function() {
		var sysTriggerGr = new GlideRecord("sys_trigger");
		sysTriggerGr.setValue("name", "SLA Async Job - " + GlideCounter.next(SLAAsyncSNC.JOB_COUNTER_NAME));
		sysTriggerGr.setValue("next_action", new GlideDateTime());
		sysTriggerGr.setValue("priority", this.jobPriority);
		// Initially create the trigger as "On demand" - we'll update to "Run once" later when we've finished delegating records to the job
		sysTriggerGr.setValue("trigger_type", "2");
		sysTriggerGr.setValue("script", "new SLAAsyncQueue().processQueue(g_schedule_record);");
		if (!sysTriggerGr.insert()) {
			this.lu.logError("_createTrigger: failed to create sys_trigger record with name \"" + sysTriggerGr.getValue("name") + "\":\n" + sysTriggerGr.getLastErrorMessage());
			return null;
		}

		return sysTriggerGr;
	},

	_allocateRecordsToTrigger: function(sysTriggerGr, slaAsyncQueueIds) {
		if (!sysTriggerGr || !sysTriggerGr.isValidRecord())
			return;

		if (!slaAsyncQueueIds || slaAsyncQueueIds.length === 0)
			return;

		var slaAsyncQueueGr = new GlideRecord(SLAAsyncSNC.SLA_ASYNC_QUEUE);
		slaAsyncQueueGr.addQuery("sys_id", slaAsyncQueueIds);
		slaAsyncQueueGr.setWorkflow(false);
		slaAsyncQueueGr.setValue("sys_trigger", sysTriggerGr.getUniqueValue());
		slaAsyncQueueGr.setValue("state", "queued");
		slaAsyncQueueGr.updateMultiple();
	},

	_recoverStuckRecords: function() {
		var slaAsyncQueueGr = new GlideRecord(SLAAsyncSNC.SLA_ASYNC_QUEUE);
		slaAsyncQueueGr.addQuery("state", "IN", "queued,processing");
		slaAsyncQueueGr.addNullQuery("sys_trigger");
		slaAsyncQueueGr.setWorkflow(false);
		slaAsyncQueueGr.setValue("state", "ready");
		slaAsyncQueueGr.updateMultiple();
	},

	type: 'SLAAsyncDelegatorSNC'
};
```