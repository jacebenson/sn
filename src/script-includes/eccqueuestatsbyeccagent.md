---
title: "ECCQueueStatsByECCAgent"
id: "eccqueuestatsbyeccagent"
---

API Name: global.ECCQueueStatsByECCAgent

```js
var ECCQueueStatsByECCAgent = Class.create();

ECCQueueStatsByECCAgent.prototype = {

	/***********************************************************************************************************/
	initialize: function() {

		this.TABLE_NAME__ECC_QUEUE_STATS_BY_ECC_AGENT = 'ecc_queue_stats_by_ecc_agent';

		this.new_last_refreshed_date = new GlideDateTime();    
		this.agents = [];                           // array of ECC Agent names

		this.oldest_entry_date_ready_input = {};        // map from ECC Agent name to oldest_entry_date_ready_input
		this.oldest_entry_date_ready_output = {};       // map from ECC Agent name to oldest_entry_date_ready_output
		this.oldest_entry_date_processing_input = {};   // map from ECC Agent name to oldest_entry_date_processing_input
		this.oldest_entry_date_processing_output = {};  // map from ECC Agent name to oldest_entry_date_processing_output
		this.oldest_entry_date_processed_input = {};    // map from ECC Agent name to oldest_entry_date_processed
		this.oldest_entry_date_processed_output = {};   // map from ECC Agent name to oldest_entry_date_processed

		this.current_count_ready_input = {};        // map from ECC Agent name to current_count_ready_input
		this.current_count_ready_output = {};       // map from ECC Agent name to current_count_ready_output
		this.current_count_processing_input = {};   // map from ECC Agent name to current_count_processing_input
		this.current_count_processing_output = {};  // map from ECC Agent name to current_count_processing_output
		this.current_count_processed_input = {};    // map from ECC Agent name to current_count_processed_input
		this.current_count_processed_output = {};   // map from ECC Agent name to current_count_processed_output

		this.interval_duration_seconds = parseInt(
											gs.getProperty('glide.ecc_queue.stats.collect.interval_duration_seconds',
														   '300'),
												10);  // radix for parsing


		this.interval_count_ready_input = {};        // map from ECC Agent name to interval_count_ready_input
		this.interval_count_ready_output = {};       // map from ECC Agent name to interval_count_ready_output
		this.interval_count_processing_input = {};   // map from ECC Agent name to interval_count_processing_input
		this.interval_count_processing_output = {};  // map from ECC Agent name to interval_count_processing_output
		this.interval_count_processed_input = {};    // map from ECC Agent name to interval_count_processed_input
		this.interval_count_processed_output = {};   // map from ECC Agent name to interval_count_processed_output
	},
	/***********************************************************************************************************/
	refreshECCQueueStatsByECCAgent: function() {

		var shard_duration = this._fetchShardDuration();

		this._deleteOldRecords(shard_duration);

		this._computeOldestEntryDates(shard_duration);
		this._computeCurrentCounts(shard_duration);

		var use_fixed_length_interval = JSUtil.toBoolean( 
													gs.getProperty(
														'glide.ecc_queue.stats.collect.use_fixed_length_interval',
															'true'));
		if (!use_fixed_length_interval)
			this._computeIntervalDurationSeconds();

		this._computeIntervalCounts();

		this._dedupeAgentNames();
		this._removeBroadcastAgentName();
		this._updateOrInsertRecords();
	},
	/***********************************************************************************************************/
	/** 
	 * Computes the interval_duration_seconds based on the last time this date was refreshed.
	 */
	_computeIntervalDurationSeconds: function() {

		var ga = new GlideAggregate(this.TABLE_NAME__ECC_QUEUE_STATS_BY_ECC_AGENT);

		// The most recent last_refreshed_date in our table
		ga.addAggregate('MAX', 'last_refreshed_date');
		ga.query();

		if (ga.next()) {

			var old_date = ga.getAggregate('MAX', 'last_refreshed_date');
			var old_date_gdt = new GlideDateTime(old_date);
			var old_date_millis = old_date_gdt.getNumericValue();
			var new_date = new GlideDateTime(this.new_last_refreshed_date);
			var new_date_millis = new_date.getNumericValue();
	
			var interval_duration_millis = new_date_millis - old_date_millis;
			this.interval_duration_seconds = interval_duration_millis / 1000;

		} else {

			this.interval_duration_seconds = parseInt(
											gs.getProperty('glide.ecc_queue.stats.collect.interval_duration_seconds',
														   '300'),
												10);  // radix for parsing
		}
	},
	/***********************************************************************************************************/
	/**
	 * returns a GlideDateTime which is the duration of the table rotation on ecc_queue
	 *
	 */
	_fetchShardDuration: function() {

		// Preempt this calculation to optimize for large data sets.
		return new GlideDateTime('1970-01-01 04:00:00');  // 4 hours

		/*
		var tableRotationGr = new GlideRecord('sys_table_rotation');

		tableRotationGr.addQuery('name', 'ecc_queue');
		tableRotationGr.query();

		if (tableRotationGr.next()) {
			var shard_duration_string = tableRotationGr.getValue('duration');
			return new GlideDateTime(shard_duration_string);
		} else {
			return new GlideDateTime('1970-01-02 00:00:00');  // 1 day
		}
		*/
	},
	/************************************************************************************************************/
	_deleteOldRecords: function(shard_duration) {

		var cutoff = new GlideDateTime(this.new_last_refreshed_date);

		var shard_duration_millis = shard_duration.getNumericValue();
		// We don't care for data that's 3 shards old
		cutoff.subtract(3*shard_duration_millis);

		var tableGr = new GlideRecord(this.TABLE_NAME__ECC_QUEUE_STATS_BY_ECC_AGENT);
		tableGr.addQuery('last_refreshed_date', '<', cutoff);
		tableGr.query();
		tableGr.deleteMultiple();
	},
	/***********************************************************************************************************/
	_computeOneShardAgoStartCutoff: function(shard_duration) {

		var start_cutoff = new GlideDateTime(this.new_last_refreshed_date);
		var shard_duration_millis = shard_duration.getNumericValue();
		start_cutoff.subtract(shard_duration_millis);
		// add a little extra to make sure we don't look beyond 2 shards to improve performance
		start_cutoff.addSeconds(this.interval_duration_seconds * 2);

		return start_cutoff;
	},
	/***********************************************************************************************************/
	_computeOldestEntryDates: function(shard_duration) {

		var start_cutoff = this._computeOneShardAgoStartCutoff(shard_duration);

		var ga = new GlideAggregate('ecc_queue');

		// Minimize the number of shards we look at - we have to include sys_created_on
		ga.addQuery('sys_created_on', '>', start_cutoff);
		ga.addQuery('sys_created_on', '<=', this.new_last_refreshed_date);

		// Set the range
		ga.addQuery('sys_updated_on', '>', start_cutoff);
		ga.addQuery('sys_updated_on', '<=', this.new_last_refreshed_date);

		// Optimization to reduce the number of rows returned
		ga.addQuery('state', '!=', 'processed');

		// Set the group by keys
		ga.groupBy('agent');
		ga.groupBy('state');
		ga.groupBy('queue');

		// Set the aggregate function for determining oldest entry date
		ga.addAggregate('MIN', 'sys_updated_on');

		ga.query();
		while (ga.next()) {

			var oldest_entry_date = ga.getAggregate('MIN', 'sys_updated_on');
			var agent = ga.getValue('agent');
			var state = ga.getValue('state');
			var queue = ga.getValue('queue');

			if (JSUtil.nil(agent)) {
				gs.warn('ECCQueueStatsByECCAgent._computeOldestEntryDates() found nil agent');
				continue;
			}

			if (JSUtil.nil(state)) {
				gs.warn('ECCQueueStatsByECCAgent._computeOldestEntryDates() found nil state');
				continue;
			}

			if (JSUtil.nil(queue)) {
				gs.warn('ECCQueueStatsByECCAgent._computeOldestEntryDates() found nil queue');
				continue;
			}

			// Add the MID Server to our master list
			this.agents.push(agent);


			if (state == 'ready') {

				if (queue == 'input')
					this.oldest_entry_date_ready_input[agent] = oldest_entry_date;
				else 
				if (queue == 'output')
					this.oldest_entry_date_ready_output[agent] = oldest_entry_date;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeOldestEntryDates() found invalid queue value');

			}
			else 
			if (state == 'processing') {

				if (queue == 'input')
					this.oldest_entry_date_processing_input[agent] = oldest_entry_date;
				else 
				if (queue == 'output')
					this.oldest_entry_date_processing_output[agent] = oldest_entry_date;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeCurrentOldestEntryDates() found invalid queue value');

			}
			else
			if (state == 'processed') {
	
				if (queue == 'input')
					this.oldest_entry_date_processed_input[agent] = oldest_entry_date;
				else 
				if (queue == 'output')
					this.oldest_entry_date_processed_output[agent] = oldest_entry_date;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeOldestEntryDates() found invalid queue value');
				
			}
			else {
				// We don't care about other states like error at this time
			}

		} // end of while loop

	},
	/***********************************************************************************************************/
	_computeCurrentCounts: function(shard_duration) {

		var start_cutoff = this._computeOneShardAgoStartCutoff(shard_duration); 

		var ga = new GlideAggregate('ecc_queue');

		// Minimize the number of shards we look at - we have to include sys_created_on
		ga.addQuery('sys_created_on', '>', start_cutoff);
		ga.addQuery('sys_created_on', '<=', this.new_last_refreshed_date);

		// Set the range
		ga.addQuery('sys_updated_on', '>', start_cutoff);
		ga.addQuery('sys_updated_on', '<=', this.new_last_refreshed_date);

		// Optimization to reduce the number of rows returned
		ga.addQuery('state', '!=', 'processed');

		// Set the group by keys
		ga.groupBy('agent');
		ga.groupBy('state');
		ga.groupBy('queue');

        // Set the aggregate function for determining how many 'input' or 'output'
		ga.addAggregate('COUNT', 'queue');

		ga.query();
		while (ga.next()) {
			var count = ga.getAggregate('COUNT', 'queue');
			var agent = ga.getValue('agent');
			var state = ga.getValue('state');
			var queue = ga.getValue('queue');

			if (JSUtil.nil(agent)) {
				gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found nil agent');
				continue;
			}

			if (JSUtil.nil(state)) {
				gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found nil state');
				continue;
			}

			if (JSUtil.nil(queue)) {
				gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found nil queue');
				continue;
			}

			if (state == 'ready') {

				if (queue == 'input')
					this.current_count_ready_input[agent] = count;
				else 
				if (queue == 'output')
					this.current_count_ready_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found invalid queue value');

			}
			else 
			if (state == 'processing') {

				if (queue == 'input')
					this.current_count_processing_input[agent] = count;
				else 
				if (queue == 'output')
					this.current_count_processing_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found invalid queue value');

			}
			else
			if (state == 'processed') {
	
				if (queue == 'input')
					this.current_count_processed_input[agent] = count;
				else 
				if (queue == 'output')
					this.current_count_processed_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeCurrentCounts() found invalid queue value');
				
			}
			else {
				// We don't care about other states like error at this time
			}

		} // end of while loop
    }, 
    /***********************************************************************************************************/
    _computeIntervalCounts: function() {

		var start_cutoff = new GlideDateTime(this.new_last_refreshed_date);
		start_cutoff.addSeconds(-1 * this.interval_duration_seconds);

		var ga = new GlideAggregate('ecc_queue');

		// Minimize the number of shards we look at - we have to include sys_created_on
		ga.addQuery('sys_created_on', '>', start_cutoff);
		ga.addQuery('sys_created_on', '<=', this.new_last_refreshed_date);

		// Set the range
		ga.addQuery('sys_updated_on', '>', start_cutoff);
		ga.addQuery('sys_updated_on', '<=', this.new_last_refreshed_date);

		// Set the group by keys
		ga.groupBy('agent');
		ga.groupBy('state');
		ga.groupBy('queue');

        // Set the aggregate function for determining how many 'input' or 'output'
		ga.addAggregate('COUNT', 'queue');

		ga.query();
		while (ga.next()) {
			var count = ga.getAggregate('COUNT', 'queue');
			var agent = ga.getValue('agent');
			var state = ga.getValue('state');
			var queue = ga.getValue('queue');

			if (JSUtil.nil(agent)) {
				gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found nil agent');
				continue;
			}

			if (JSUtil.nil(state)) {
				gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found nil state');
				continue;
			}

			if (JSUtil.nil(queue)) {
				gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found nil queue');
				continue;
			}

			if (state == 'ready') {

				if (queue == 'input')
					this.interval_count_ready_input[agent] = count;
				else 
				if (queue == 'output')
					this.interval_count_ready_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found invalid queue value');

			}
			else 
			if (state == 'processing') {

				if (queue == 'input')
					this.interval_count_processing_input[agent]= count;
				else 
				if (queue == 'output')
					this.interval_count_processing_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found invalid queue value');
				
			}
			else
			if (state == 'processed') {
	
				if (queue == 'input')
					this.interval_count_processed_input[agent]= count;
				else 
				if (queue == 'output')
					this.interval_count_processed_output[agent] = count;
				else
					gs.warn('ECCQueueStatsByECCAgent._computeIntervalCounts() found invalid queue value');

			} else {
				// We don't care about other states like error at this time
			}

		} // end of while loop
    },
    /***********************************************************************************************************/
    _dedupeAgentNames: function() {

        var arrayUtil = new ArrayUtil();
        this.agents = arrayUtil.unique(this.agents);
    },
    /***********************************************************************************************************/
	_removeBroadcastAgentName: function() {

		var found_index = this.agents.indexOf('mid.server.*');

   		while (found_index !== -1) {
        	this.agents.splice(found_index, 1);
        	found_index = this.agents.indexOf('mid.server.*');
    	}
	},
    /***********************************************************************************************************/
    _updateOrInsertRecords: function() {

        for (var i=0; i < this.agents.length; i++) {

            var agent = this.agents[i];

            var eccQueueStatsGr = new GlideRecord(this.TABLE_NAME__ECC_QUEUE_STATS_BY_ECC_AGENT);
            eccQueueStatsGr.addQuery('agent', agent);
            eccQueueStatsGr.query();

            if (eccQueueStatsGr.next()) {
                this._updateRecord(eccQueueStatsGr, agent);
            } else {
                this._insertRecord(agent);
            }
        }
    },
    /***********************************************************************************************************/
    _updateRecord: function(eccQueueStatsGr, agent) {

		this._lookupAndSetValuesOnGlideRecord(eccQueueStatsGr, agent);

		eccQueueStatsGr.update();
	},
    /***********************************************************************************************************/
    _insertRecord: function(agent) {

        var toInsert = new GlideRecord(this.TABLE_NAME__ECC_QUEUE_STATS_BY_ECC_AGENT);
        toInsert.initialize();

		toInsert.setValue('agent', agent);
		this._lookupAndSetValuesOnGlideRecord(toInsert, agent);

        toInsert.insert();
    },
    /***********************************************************************************************************/
    _lookupAndSetValuesOnGlideRecord: function(eccQueueStatsGr, agent) {

		/////////////////////////////////////////////
		// LAST REFRESHED DATE
		/////////////////////////////////////////////
		eccQueueStatsGr.setValue('last_refreshed_date', this.new_last_refreshed_date);



		/////////////////////////////////////////////
		// OLDEST ENTRY DATES
		/////////////////////////////////////////////
		if (this.oldest_entry_date_ready_input[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_ready_input', this.oldest_entry_date_ready_input[agent]);

		if (this.oldest_entry_date_ready_output[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_ready_output', this.oldest_entry_date_ready_output[agent]);

		if (this.oldest_entry_date_processing_input[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_processing_input', this.oldest_entry_date_processing_input[agent]);

		if (this.oldest_entry_date_processing_output[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_processing_output', this.oldest_entry_date_processing_output[agent]);

		if (this.oldest_entry_date_processed_input[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_processed_input', this.oldest_entry_date_processed_input[agent]);

		if (this.oldest_entry_date_processed_output[agent])
			eccQueueStatsGr.setValue('oldest_entry_date_processed_output', this.oldest_entry_date_processed_output[agent]);




		/////////////////////////////////////////////
		// CURRENT COUNTS
		/////////////////////////////////////////////
		if (this.current_count_ready_input[agent])
			eccQueueStatsGr.setValue('current_count_ready_input', this.current_count_ready_input[agent]);
		else
			eccQueueStatsGr.setValue('current_count_ready_input', 0);
		
		if (this.current_count_ready_output[agent])
			eccQueueStatsGr.setValue('current_count_ready_output', this.current_count_ready_output[agent]);
		else
			eccQueueStatsGr.setValue('current_count_ready_output', 0);
		
		if (this.current_count_processing_input[agent])
			eccQueueStatsGr.setValue('current_count_processing_input', this.current_count_processing_input[agent]);
		else 
			eccQueueStatsGr.setValue('current_count_processing_input', 0);
		
		if (this.current_count_processing_output[agent])
			eccQueueStatsGr.setValue('current_count_processing_output', this.current_count_processing_output[agent]);
		else
			eccQueueStatsGr.setValue('current_count_processing_output', 0);
		
		if (this.current_count_processed_input[agent])
			eccQueueStatsGr.setValue('current_count_processed_input', this.current_count_processed_input[agent]);
		else
			eccQueueStatsGr.setValue('current_count_processed_input', 0);

		if (this.current_count_processed_output[agent])
			eccQueueStatsGr.setValue('current_count_processed_output', this.current_count_processed_output[agent]);
		else
			eccQueueStatsGr.setValue('current_count_processed_output', 0);


		/////////////////////////////////////////////
		// INTERVAL DURATION SECONDS
		/////////////////////////////////////////////
		eccQueueStatsGr.setValue('interval_duration_seconds', this.interval_duration_seconds);




		/////////////////////////////////////////////
		// INTERVAL COUNTS
		/////////////////////////////////////////////
		if (this.interval_count_ready_input[agent])
			eccQueueStatsGr.setValue('interval_count_ready_input', this.interval_count_ready_input[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_ready_input', 0);

		if (this.interval_count_ready_output[agent])
			eccQueueStatsGr.setValue('interval_count_ready_output', this.interval_count_ready_output[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_ready_output', 0);
		
		if (this.interval_count_processing_input[agent])
			eccQueueStatsGr.setValue('interval_count_processing_input', this.interval_count_processing_input[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_processing_input', 0);
			
		if (this.interval_count_processing_output[agent])
			eccQueueStatsGr.setValue('interval_count_processing_output', this.interval_count_processing_output[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_processing_output', 0);
		
		if (this.interval_count_processed_input[agent])
			eccQueueStatsGr.setValue('interval_count_processed_input', this.interval_count_processed_input[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_processed_input', 0);
		
		if (this.interval_count_processed_output[agent])
			eccQueueStatsGr.setValue('interval_count_processed_output', this.interval_count_processed_output[agent]);
		else
			eccQueueStatsGr.setValue('interval_count_processed_output', 0);

	},
	/***********************************************************************************************************/

	type: 'ECCQueueStatsByECCAgent'
};
```