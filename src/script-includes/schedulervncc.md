---
title: "SchedulerVNCC"
id: "schedulervncc"
---

API Name: global.SchedulerVNCC

```js
/* 
 * Scheduler script include used with Versatile Node and Cluster Configuration
 */
gs.include("PrototypeServer");

var SchedulerVNCC = Class.create();

SchedulerVNCC.prototype = {
   initialize : function() {
      
      this.local_id = GlideClusterSynchronizer.getSystemID();
   },
   
   stop : function(node_id) {
      this._queueAction(node_id, 'stop');
   },
   
   start : function(node_id) {
      this._queueAction(node_id, 'start');
      
   },
	
   /*_________________________________________________________________
   * Description: Ensures child sys_trigger entries for the specified node
                  for any run "ALL NODES" scheduled jobs. Handles insertions
                  and deletions of nodes.
   * Parameters:
   * Returns:
   ________________________________________________________________*/
   propagateRATriggersForNode: function(node) {
      var trig = new GlideRecord("sys_trigger");
      trig.addQuery("system_id", "IN", "ALL NODES, ACTIVE NODES");
      trig.query();
      while (trig.next()){
         this._propagateAllNodes(node, trig);
      }
   },
   
   /*_________________________________________________________________
   * Description: Ensures run "ALL NODES" for a given scheduled job are
                  propagated to all nodes. 
   * Parameters:
   * Returns:
   ________________________________________________________________*/
   propagateRANodesForTrigger: function(trigger) {
      var nd = new GlideRecord("sys_cluster_state");
      nd.addQuery("status", "online");
      nd.addJoinQuery("sys_node_type");
      var schedulers;
      if (JSUtil.toBoolean(gs.getProperty('com.snc.cluster.vncc.schedulers_on_node_type')))
        schedulers = "node_type.schedulers";
      else
        schedulers = "schedulers";

      if (trigger.system_id == "ACTIVE NODES") 
          nd.addQuery(schedulers, "any");
      nd.query();
      while (nd.next()){
         this._propagateAllNodes(nd, trigger);
      }	   
   },
   
   /*_________________________________________________________________
    * Description: Will create or delete sys_trigger entries for run "ALL NODES" jobs.
    * Parameters: GlideRecord(SYS_CLUSTER_STATE), GlideRecord(SYS_TRIGGER)
   ________________________________________________________________*/
   _propagateAllNodes: function(node_gr, trigger_gr) {
      var nc = new GlideRecord("sys_trigger");
      nc.addQuery("sys_id", trigger_gr.sys_id);
      nc.query();
      //Don't recreate in the case of a delete op (ref cascade handles actual delete)
      if (!nc.next())
         return;

      gs.print("SchedulerVNCC()._propogateAllNodes node - "+node_gr.system_id+", job name - "+trigger_gr.name+", job id - "+trigger_gr.sys_id);	
      var ch = GlideRecord("sys_trigger");
      ch.addQuery("system_id", node_gr.system_id);
      ch.addQuery("parent", trigger_gr.sys_id);
      ch.query();
      if (ch.next()) {
          gs.print("Deleting the existing child job (id- "+ch.sys_id+" ) of parent - "+trigger_gr.name+" for node - "+node_gr.system_id);
          ch.deleteRecord();  
      }

      if (nc.system_id != trigger_gr.system_id)
         return;
 
      if (node_gr.status == "offline") {
         gs.print("Node " + node_gr.system_id + " status is offline, not adding any child job (for "+trigger_gr.name+") pinned to this node");
         return;
      }
      
      var schedulers;
      if (JSUtil.toBoolean(gs.getProperty('com.snc.cluster.vncc.schedulers_on_node_type')))
        schedulers = node_gr.node_type.schedulers;
      else
        schedulers = node_gr.schedulers;

      if (schedulers == "none") {
         gs.print("Node " + node_gr.system_id + " scheduler mode is none, not adding any child job (for "+trigger_gr.name+") pinned to this node");
         return;
      }

      if (trigger_gr.system_id == "ACTIVE NODES" && schedulers != "any") {
		gs.print("Node scheduler is not set to ANY (mode is "+ schedulers + ") , not adding any child job (for "+trigger_gr.name+") pinned to this node");
		return;
      }

      nc.addEncodedQuery(node_gr.node_type.job_criteria);
      nc.query();
      if (!nc.next())
         return;

      nc.parent = trigger_gr.sys_id;
      nc.system_id = node_gr.system_id;
      nc.insert();
      gs.print("Inserted child entry for parent job "+trigger_gr.name+" for node - "+node_gr.system_id); 
   },
   
   _queueAction : function(node_id, action) {
      this.node_id = node_id;
      var node_list = this._getNodeList();
      for (var i =0; i < node_list.length; i++)
         GlideClusterMessage.postDirected('scheduler.action', action, node_list[i]);
      
   },
   
   _getNodeList : function() {
      var node_list = new Array();
      if (this.node_id == 'ALL') {
         var gr = new GlideRecord('sys_cluster_state');
         gr.query();
         while (gr.next())
            node_list.push(gr.system_id + '');
      } else
      node_list.push(this.node_id);
      
      return node_list;
   }
};
```