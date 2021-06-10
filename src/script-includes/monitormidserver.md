---
title: "MonitorMIDServer"
id: "monitormidserver"
---

API Name: global.MonitorMIDServer

```js
/*
 * Monitors MID servers, using the heartbeat probe.
 */

var MonitorMIDServer = Class.create();

MonitorMIDServer.STATUS_RECORD = 'mid.monitor.heartbeat_sent';

MonitorMIDServer.prototype = {
    
    /*
     * Do everything required for a scheduled MID server monitor cycle.
     */
    monitor: function() {
        this.killOldRequests();
        this.markDowners();
        this.sendHeartbeatRequests();
    },
    
    /*
     * Mark any non-responding MID servers as being down.
     *
     * There are two timestamps that are updated separately:
     *   1. last_heartbeat_sent is the last time an output heartbeat message was sent by this monitor.
     *   2. last_refreshed is the last time the mid server status was updated.
     *
     * The monitor looks for any mid server activity (last_refreshed is updated or any ecc input message)
     * between now and last_heartbeat_sent, and if there is nothing, it will mark the mid server as Down.
     *
     * Because of the time drift issue when moving between nodes, last_refreshed and last_heartbeat_sent
     * can be few seconds before or after the actual time.  To solve the issue, we extends the query window
     * to the past by substracting some extra time from last_heartbeat_sent.
     */
    markDowners: function() {
        // find the last time we sent a heartbeat...
        var gr = new GlideRecord('sys_status');
        gr.addQuery('name', MonitorMIDServer.STATUS_RECORD);
        gr.query();
        if (!gr.next())
            return;
        var last_heartbeat_sent = new GlideDateTime(gr.value);
        // add some extra time to query condition to address the time drift issue when moving between instance nodes
        last_heartbeat_sent.addSeconds(-5);

        // find all the non-responding MID servers...
        gr = new GlideRecord('ecc_agent');
        gr.addQuery('last_refreshed', '<', last_heartbeat_sent);
        gr.addQuery('status', '!=', 'Down');
        gr.query();
        while (gr.next()) {
            if (! this.hasRecentActivity('' + gr.name, last_heartbeat_sent)) {
                gr.status = 'Down';
                gr.update();
            }
        }
    },
    
    /*
     * Check if the given agent name has written to the ecc_queue more recently than the given time.
     * This protects against marking an overloaded (but functioning) mid server as 'down' inappropriately.
     */
    hasRecentActivity: function(agentName, time) {
        var gr = new GlideRecord('ecc_queue');
        gr.addQuery('sys_created_on', '>=', time);
        // time bound is an optimization to tell GR to focus on one or two ecc_queue shards and not join all shards
        gr.addQuery('sys_created_on', '<=', gs.minutesAgo(0));
        gr.addQuery('agent', 'mid.server.' + agentName);
        gr.addQuery('queue', 'input');
        gr.query();
        if (gr.hasNext())
            return true;
        
        return false;
    },

    /*
     * Send heartbeat requests to all MID servers, and note when we did it.
     */
    sendHeartbeatRequests: function() {
        // first send the requests...
        var now = gs.nowNoTZ();
        var gr = new GlideRecord('ecc_queue');
        gr.initialize();
        gr.agent = 'mid.server.*';  // a business rule turns this into individual requests...
        gr.queue = 'output';
		gr.priority = 0;
        gr.topic = 'HeartbeatProbe';
        gr.state = 'ready';
        gr.insert();
        
        // then update or insert our status record to show when we sent them...
        gr = new GlideRecord('sys_status');
        gr.addQuery('name', MonitorMIDServer.STATUS_RECORD);
        gr.query();
        if (gr.next()) {
            gr.value = now;
            gr.update();
        } else {
            gr.initialize();
            gr.value = now;
            gr.name = MonitorMIDServer.STATUS_RECORD;
            gr.description = 'Last time MID server heartbeat probes were launched';
            gr.insert();
        }
    },
    
    /*
     * If there are any heartbeat probe requests that haven't been processed, cancel them so that they don't accumulate when
     * a MID server is down for a while...
     */
    killOldRequests: function() {
        var gr = new GlideRecord('ecc_queue');
        gr.addQuery('agent', 'STARTSWITH', 'mid.server.');
        gr.addQuery('queue', 'output');
        gr.addQuery('state', '!=', 'processed');
        gr.addQuery('topic', 'HeartbeatProbe');
        gr.addQuery("sys_created_on", ">", gs.minutesAgo(10));
        gr.addQuery("sys_created_on", "<=", gs.minutesAgo(0)); // Bound the ecc_queue because of potential table rotation schedules in the future
        gr.query();
        while (gr.next()) {
            gr.state = 'processed';
            gr.processed = gs.nowDateTime();
            gr.update();
        }
    },
    
    type: 'MonitorMIDServer'
};

```