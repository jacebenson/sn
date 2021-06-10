---
title: "LongRunner"
id: "longrunner"
---

API Name: global.LongRunner

```js
var LongRunner = Class.create();

//
// This is a more evolved version of DiscoveryLongRunner that avoids polling via repeating probes
//  and allows customers to customize without modifying OOB scripts and complicating future updates.
//
// Customers may extend this class to customize long running command handling, for example,
//  overriding error() to implement a different retry scheme that discriminates between
//  retryable and fatal errors. You might also override _nextPollTime() to come up with
//  a more sophisticated polling frequency rolloff scheme. ...or override _error(), _warn(), and _info()
//  and rework the logging.
//
// Alternately, the whole class may be replaced by creating a new class that implements
//  the start() and error() methods.
//
// When customizing, set glide.eccprobe.longrunner.class to the name of the new class.
//

LongRunner.prototype = {
	// class - LongRunner class (allows extending LongRunner)
	PROP_CLASS : "glide.eccprobe.longrunner.class",
	DEFAULT_CLASS : "LongRunner",
	// debug - "True" to report non-error events in the log
	PROP_DEBUG : "glide.eccprobe.longrunner.debug",
	// retry_minutes - Give up on retrying failures that have persisted longer than retry_minutes
	PROP_RETRY_M : "glide.eccprobe.longrunner.retry_minutes",
	DEFAULT_RETRY_M : "10",
	// interval.initial_seconds - Set the initial polling period to interval.initial_seconds
	PROP_INTERVAL_INITIAL_S : "glide.eccprobe.longrunner.interval.initial_seconds",
	DEFAULT_INTERVAL_INITIAL_S : "20",
	// interval.backoff_percent - Increase polling interval by this percentage per poll
	PROP_INTERVAL_BACKOFF_PCT : "glide.eccprobe.longrunner.interval.backoff_percent",
	DEFAULT_INTERVAL_BACKOFF_PCT : "15",
	// interval.max_seconds - Cap the polling interval at this value
	PROP_INTERVAL_MAX_S : "glide.eccprobe.longrunner.interval.max_seconds",
	DEFAULT_INTERVAL_MAX_S : "300",
	// max_poll_count - Limit the number of polling probes launched per LongRunner.poll()
	PROP_MAX_PROBES_PER_POLL : "glide.eccprobe.longrunner.max_poll_count",

	initialize: function() {
		this.longRunnerClass = gs.getProperty(this.PROP_CLASS, this.DEFAULT_CLASS);
		this.debug = gs.getProperty(this.PROP_DEBUG);
		this.debug = !!(this.debug && this.debug.toLowerCase() == 'true'); // String (or nil) to boolean
	},

/*
 * The methods in this section get called in the context of a sensor.
 * The prior probe is accessed via the g_probe global.
 */

	// API entry point, called once on successful SSHCommandLong completion.
	//
	// Should initiate "polling," a series of SSHCommand operations with long_sensor pointing to
	//  our sensor() method.
	//
	// Return boolean false if processing is complete, bypassing main sensor.
	// Return boolean true or throw things if processing is incomplete,
	//  allowing main sensor to run and terminating the command.
	start: function() {
		this._scheduleNextPoll();
		return true;
	},

	// API entry point, called on probe error response (be it start, or poll.)
	//
	// Should determine if the error is retryable or fatal.
	//
	// Return boolean true if processing is complete, bypassing main sensor. (Retryable)
	// Return boolean false (or throw things) if processing is incomplete, allowing main
	// sensor to run. (Fatal)
	//
	// This implementation retries a fixed number of times before giving up.
	//
	// Note that error() is a public function to handle ecc_queue input with an error in the result and
	// _error() is a local function to log an error message.

	error: function() {
		// If the command never started, just report the problem.
		if (g_probe.topic == 'SSHCommandLong') {
			this._error('Not retrying: failed before polling started.');
			return false;
		}

		// Tolerate bursts of failures up to glide.eccprobe.longrunner.retry_minutes long.
		// This is measured from the time of the first failing ecc_queue input, failing_since
		// to the most recent, g_probe's sys_created_on.
		if (typeof(failing_since) !== 'undefined') {
			var gdtFailingSince = failing_since && GlideDateTime(failing_since);
			var retryMinutes = parseInt(gs.getProperty(this.PROP_RETRY_M, this.DEFAULT_RETRY_M));
			var gdtEarliestTime = new GlideDateTime(g_probe.getEccQueueRecord().sys_created_on);
			gdtEarliestTime.addSeconds(-retryMinutes * 60);

			// We've been trying for glide.eccprobe.longrunner.retry_minutes and no joy. Time to pack it in.
			if (gdtFailingSince && gdtFailingSince.before(gdtEarliestTime)) {
				this._error('Giving up on retries.\n' +
						this.PROP_RETRY_M + ' = {0}\n' +
						'Failing since {1}', retryMinutes, '' + gdtFailingSince.getDisplayValue());
				return false;
			}

			this._warn('Retrying on repeated error.\n' +
					this.PROP_RETRY_M + ' = {0}\n' +
					'Failing since {1}', retryMinutes, '' + gdtFailingSince.getDisplayValue());
		} else
			this._warn('Retrying on initial error.');

		// Ask again later.
		this._scheduleNextPoll();
		return true;
	},

	// Non-API entry point.
	//
	// We set long_sensor in our polling probes to cause this to be called as each
	//  polling probe result comes in, if successful.
	//
	// Returns true if polling should continue, false if the command is complete.
	sensor: function() {
		if (!output) {
			// Should *never* happen. Not going to bother to retry it with this.error().
			throw this._getFailureHeader() + 'Missing output field in a non-error result.';
		}

		// Still running? Ask again later.
		if (this._stillRunning(output)) {
			this._scheduleNextPoll();
			return true;
		}

		// Not still running? Create a new complete probe.
		if (this._completeProbe() == null) {
			this._error('Failed to create complete probe.');
			return false;
		} else {
			this._info('Command complete. Collecting results.');
			return true;
		}
	},

	// Issue a new probe to complete the long running command
	// This is done as a separate probe from polling so that we can discriminate between
	//  failed polling and failed completion.
	_completeProbe: function() {
		var subdir = '.run.' + g_probe.getParameter('ssh_long_id');
		var path = '/tmp/' + subdir + '/';
		var probeOut = new SncProbe();
		probeOut.setSource(g_probe.getParameter('source')); // SncProbe.getSource() not scriptable. PRB1284487
		var correlator = g_probe.getCorrelator();
		probeOut.setCorrelator(g_probe.getCorrelator());
		// "probe" parameter does not copy for free as it is in the Probe.NOT_TO_COPY list.
		probeOut.addParameter("probe", g_probe.getParameter("probe"));
		probeOut.copy(g_probe);
		probeOut.setTopic('SSHCommand');
		var completeMustSudo = probeOut.getBooleanParameter('complete_must_sudo', false);
		probeOut.setName('sh ' + path + 'complete');
		probeOut.addParameter('must_sudo', completeMustSudo);
		probeOut.addParameter('run_directory', subdir);
		probeOut.setParameter('failing_since', null);
		probeOut.setParameter('long_error_handler', null);

		return probeOut.create(g_probe.agent);
	},

	// Future API entry point, called on probe error response (be it start, or poll.)
	//
	// Tear down a potentially incomplete LRC
	cancel: function() {
		throw this._getFailureHeader() + 'LongRunner.cancel() not yet implemented';
	},

	// Queue up the next poll for this LRC
	_scheduleNextPoll: function() {
		var gr = new GlideRecord('long_runner_poll');
		// Must use sudo on complete if we used sudo to create files. This
		//  will appear in must_sudo in start or complete_must_sudo in sensor
		gr.next_poll = this._nextPollTime();
		gr.previous_probe_response = g_probe.getEccQueueId();
		gr.insert();
	},

	// Find next poll time based on poll_interval from probe, or if not from initial poll time
	_nextPollTime: function() {
		var gdt = new GlideDateTime();
		var pollInterval = parseInt(g_probe.getParameter('poll_interval') ||
			gs.getProperty(this.PROP_INTERVAL_INITIAL_S, this.DEFAULT_INTERVAL_INITIAL_S));
		gdt.add(pollInterval * 1000);
		this._info('poll interval {0}, next poll {1}', pollInterval, gdt.getDisplayValue());
		return gdt;
	},

	// Find next polling interval based on current (in ms units)
	_nextPollInterval: function(previousInterval) {
		if (!previousInterval)
			previousInterval = parseInt(gs.getProperty(this.PROP_INTERVAL_INITIAL_S,
									this.DEFAULT_INTERVAL_INITIAL_S));

		var backoffPercent = parseInt(gs.getProperty(this.PROP_INTERVAL_BACKOFF_PCT,
									this.DEFAULT_INTERVAL_BACKOFF_PCT)) / 100;
		var maxInterval = parseInt(gs.getProperty(this.PROP_INTERVAL_MAX_S, this.DEFAULT_INTERVAL_MAX_S));

		return Math.min(maxInterval, Math.round(100 * previousInterval * (1 + backoffPercent)) / 100);
	},

	// Return true if probe is still running
	_stillRunning: function(output) {
		return output.startsWith("still running");
	},

	_info: function(msg, arg1, arg2) {
		if (this.debug)
			gs.info(this._getCommonHeader() + ' info:\n' + msg, arg1, arg2);
	},

	_warn: function(msg, arg1, arg2) {
		gs.warn(this._getFailureHeader() + msg, arg1, arg2);
	},

	// Note that error() is a public function to handle ecc_queue input with an error in the result and
	// _error() is a local function to log an error message.
	_error: function(msg, arg1, arg2) {
		gs.error(this._getFailureHeader() + msg, arg1, arg2);
	},

	_getFailureHeader: function() {
		return this._getCommonHeader() + ' failed:\n';
	},

	_getCommonHeader: function() {
		return 'LongRunner: ssh_long_id=' + ssh_long_id + ', sys_id=' + g_probe.getEccQueueId();
	},

/*
 * The methods in this section get called in the context of polling.
 * The prior probe is accessed via the previous_probe_response field
 *  of a long_runner_poll record.
 */

	// API entry point, called to service the polling loop.
	//
	// Query for scheduled probes and execute them.
	poll: function() {
		var pollGR = new GlideRecord('long_runner_poll');
		pollGR.addActiveQuery();
		pollGR.addQuery('next_pollRELATIVELE@minute@ago@0');
		var maxPoll = gs.getProperty(this.PROP_MAX_PROBES_PER_POLL);
		if (maxPoll) {
			pollGR.orderBy('next_poll');
			pollGR.setLimit(parseInt(maxPoll));
		}
		pollGR.query();
		while (pollGR.next()) {
			var probeResponseGR = new GlideRecord('ecc_queue');
			if (pollGR.previous_probe_response) {
				probeResponseGR.get(pollGR.previous_probe_response);
				this._pollProbe(probeResponseGR);
			}
			pollGR.active = false;
			pollGR.update();
		}
	},

	// Issue a new polling probe for a long_runner_poll GlideRecord
	_pollProbe: function(probeResponseGR) {
		// Get SncProbe object containing response to previous probe.
		var probeIn = SncProbe.createProbeResponse(probeResponseGR);
		var subdir = '.run.' + probeIn.getParameter('ssh_long_id');
		var path = '/tmp/' + subdir + '/';
		var probeOut = new SncProbe();
		probeOut.setSource(probeIn.getParameter('source')); // SncProbe.getSource() not scriptable. PRB1284487
		probeOut.setCorrelator(probeIn.getCorrelator());
		// "probe" parameter does not copy for free as it is in the Probe.NOT_TO_COPY list.
		probeOut.addParameter("probe", probeIn.getParameter("probe"));
		probeOut.copy(probeIn);
		var params = probeOut.getParametersMap();
		if (JSUtil.toBoolean(probeIn.getParameter('use_snc_ssh')))
			params.remove('must_sudo'); // Don't need root just to poll for running
		probeOut.setTopic('SSHCommand');
		var completeMustSudo = probeOut.getBooleanParameter('complete_must_sudo', false);
		var sudoString = completeMustSudo ? 'sudo ' : '';
		probeOut.setName('sh -c "cd ' + path + ';if [ -f running ];then echo still running;' +
					'[ -s nohup.out ] && echo tail of stdout:;' + sudoString + 'tail -n 5 nohup.out;' +
					'[ -s nohup.out2 ] && echo tail of stderr:;' + sudoString + 'tail -n 5 nohup.out2;' +
					'else echo not running;fi"');
		probeOut.addParameter('run_directory', subdir);
		probeOut.addParameter('long_sensor', 'new ' + this.longRunnerClass + '().sensor()');
		if (probeIn.getError()) {
			if (!probeIn.hasParameter('failing_since'))
				probeOut.addParameter('failing_since', probeResponseGR.sys_created_on);
		} else
			probeOut.setParameter('failing_since', null);
		// Displace any old repeating commands. (Only necessary at first installation.)
		if (probeIn.hasParameter('repeat_correlator'))
			probeOut.addParameter('repeat_cancel', 'true');

		var previousInterval = probeIn.getParameter('poll_interval') ||
			parseInt(gs.getProperty(this.PROP_INTERVAL_INITIAL_S, this.DEFAULT_INTERVAL_INITIAL_S));
		var nextInterval = this._nextPollInterval(previousInterval);
		probeOut.addParameter('poll_interval', nextInterval);

		return probeOut.create(probeIn.agent);
	},

	type: 'LongRunner'
};

```