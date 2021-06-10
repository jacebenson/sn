---
title: "CIUtils"
id: "ciutils"
---

API Name: global.CIUtils

```js
var CIUtils = Class.create();

CIUtils.prototype = {

   initialize : function() {
      this.maxDepth = gs.getProperty('glide.relationship.max_depth',10);  // how deep to look
      this.currentDepth = 0;

      this.services = new Object();  // list of affected services
	  this.parents = new Object();   // already checked parents
      this.maxSize = gs.getProperty('glide.relationship.threshold',1000);  // how many records to return
      this.maxSizeIndividual = gs.getProperty('glide.relationship.threshold.individual',-1);  // how many records to return
      this.added = 0;  // track how many added, since can't get size() for an Object
   },

   /**
    * Determine which business services are affected by a specific CI
    * 
    * Inputs:
    *    id is the sys_id of a configuration item (cmdb_ci)
    *
    * Returns:
    *    an array of sys_id values for cmdb_ci_server records downstream of
    *    (or affected by) the input item
    */
 
   servicesAffectedByCI: function(id) {
      var ci = new GlideRecord("cmdb_ci");
      if (ci.get(id)) {
      	if (ci.sys_class_name == "cmdb_ci_service" || ci.sys_class_name == "cmdb_ci_service_discovered"
      		|| ci.sys_class_name == "cmdb_ci_service_manual")
         	this._addService(id, this.services);
      
      	this._addParentServices(id, this.services, this.currentDepth);
      }

   	  // Add services associated by service mapping
	  this.addServicesAssociatedByServiceMapping(id);

	  var svcarr = new Array(); // services is an Object, convert to Array for final query
      for (var i in this.services)
         svcarr.push(i);
    
      return svcarr; // list of affected services
   },
   
   /**
   * Add business services associated to the CI by service mapping. Service mapping
   *  maintains service models using the CMDB service model API
   *  Input: 
   *      id - the CI sys_id 
   *  Output:
   *      svcarr - list of associated services 
   */
   addServicesAssociatedByServiceMapping: function(id) {
	   if (!GlidePluginManager.isActive('com.snc.service-mapping'))
		   return;
	   
       // Add service associations created by service mapping
       var bsm = new SNC.BusinessServiceManager();
       var svcList = bsm.getServicesAssociatedWithCi(id);
       for (var iterator = svcList.iterator(); iterator.hasNext();) {
            var svc = iterator.next();
		    this._addService(svc, this.services);
       }
   },
   /**
    * Determine which business services are affected by a task
    * 
    * Inputs:
    *    task is a task GlideRecord (e.g., incident, change_request, problem)
    *
    * Returns:
    *    an array of sys_id values for cmdb_ci_server records downstream of
    *    (or affected by) the configuration item referenced by the task's cmdb_ci field
    */

   servicesAffectedByTask: function(task) {
      var id = task.cmdb_ci.toString();
      return this.servicesAffectedByCI(id);
   },

   _addParentServices : function(value, services, currentDepth) {
	  if (this.parents[value])  // already checked?
		 return;
	  else this.parents[value] = true;
		 
     if (this.added >= this.maxSize)
       return;
     else {
       currentDepth++;
	   var al = [];
	   if (this.maxSizeIndividual > 0) {
	   	   var ciRelationInfoUtil = new SNC.CIRelationInfoUtil();
	       var allRelationsStr = ciRelationInfoUtil.getAllRelationEntries(value, this.maxSize, false, this.maxSizeIndividual, null); // returns string we need to parse
		   var allRelations = JSON.parse(allRelationsStr);
		   for(var i = 0; i < allRelations.length; i++) {
			   var relation = allRelations[i];
			   al.push(relation.childSysId);
		   }
	   }
	   else {
	   		al = SNC.CMDBUtil.getRelatedRecords(value, "", "cmdb_ci", "cmdb_ci", "child"); // returns ArrayList
	   }
   	   if (al.size() > 0) {
          // first add the unique services
          var kids = new GlideRecord('cmdb_ci_service');
          kids.addQuery('sys_id', al);
          kids.query();
          while (kids.next()) {
             var str = kids.sys_id;
             if (!services[str]) {
               this._addService(str, services);
               if (this.added >= this.maxSize)
                  return;
               if (currentDepth < this.maxDepth)
                   this._addParentServices(str, services, currentDepth);
             }
          }
   
          // now check parents of non-services
          for (var i=0; i < al.size(); i++) {
		     var parent = al.get(i);
 		     if (parent) {
                var str = parent + "";
          	    if (!services[str])  // if already in "services", we already checked its parents
                   if (currentDepth < this.maxDepth)  
                     this._addParentServices(str, services, currentDepth);
             }
		  }
       }			
     }
   },
   
   _addService: function(id, services) {
      services[id] = true;
      this.added++;
   },
   
   /**
    * Returns an array of IP addresses belonging to the given CI (including 127.0.0.1).
	*/
   getIPs: function(ci_sys_id) {
      var ipgr = new GlideRecord('cmdb_ci_ip_address');
      ipgr.addQuery('nic.cmdb_ci', ci_sys_id);
      ipgr.addQuery('ip_version', '4');
      ipgr.addQuery('install_status', '<>', 100);
      ipgr.addQuery('nic.install_status', '<>', 100);
      ipgr.query();
	  var result = [];
      while (ipgr.next())
		 result.push(ipgr.getValue('ip_address'));
	  result.push('127.0.0.1');
	  return result;
   },

   canShowRefreshServicesUIAction: function(tableClassName) {
       var ciTable = gs.getProperty('com.snc.task.refresh_impacted_services');
       if (ciTable) {
           var tableList = ciTable.split(',');
           for (var i = 0; i < tableList.length; ++i) {
               var table = tableList[i];
               table = table.trim();
               if (tableClassName + "" === table)
                   return true;
           }
       } else
           return false;
   },

	refreshImpactedServices: function(current) {
		this.removeImpactedServices(current.sys_id);
		if (!current.cmdb_ci.nil())
			this.addImpactedServices(current.sys_id, this.servicesAffectedByCI(current.cmdb_ci));
	},

	removeImpactedServices: function(taskSysId) {
		var m2m = new GlideRecord('task_cmdb_ci_service');
		m2m.addQuery('task', taskSysId);
		m2m.addQuery('manually_added', false);
		m2m.deleteMultiple();
	},

	addImpactedServices: function(taskSysId, services) {
		//Remove any manually added services from services array so we do not get unique key violation
		var manualServices = this.getManuallyAddedServices(taskSysId);
		if (manualServices.length > 0) {
			services = services.filter( function( el ) {
				return manualServices.indexOf( el ) === -1;
			});
		}

		var m2m = new GlideRecord('task_cmdb_ci_service');
		for (var i = 0; i < services.length; i++) {
			m2m.initialize();
			m2m.task = taskSysId;
			m2m.cmdb_ci_service = services[i];
			m2m.manually_added = false;
			m2m.insert();
		}
	},

	getManuallyAddedServices: function(taskSysId) {
		var manualServices = [];

		if (!taskSysId)
			return manualServices;

		var manualServicesGr = new GlideRecord('task_cmdb_ci_service');
		manualServicesGr.addQuery('task', taskSysId);
		manualServicesGr.addQuery('manually_added', true);
		manualServicesGr.query();

		while (manualServicesGr.next())
			manualServices.push(manualServicesGr.cmdb_ci_service + "");
	
		return manualServices;
	},

	refreshImpactedServicesFromAffectedCIs: function (current) {
		if (!current || !current.isValidRecord()) {
			gs.error("[CIUtils.refreshImpactedServicesFromAffectedCIs] : Invalid parameter");
			return;
		}

		var services = this._getImpactedServicesFromAffectedCIs(current.sys_id + '');
		if (services) {
			this.removeImpactedServices(current.sys_id + '');
			this.addImpactedServices(current.sys_id + '', services);
		}
	},

	_getImpactedServicesFromAffectedCIs: function (taskId) {
		var impactedServices = {};
		//fetching records from the svc_ci_assoc table
		//this table has entries when Service Mapping is being used
		//it has all CIs associated with a particular application service
		var serviceConfigItemAssocGr = new GlideAggregate("svc_ci_assoc");
		serviceConfigItemAssocGr.addQuery("JOINsvc_ci_assoc.ci_id=task_ci.ci_item!task=" + taskId);
		serviceConfigItemAssocGr.groupBy("service_id");
		serviceConfigItemAssocGr.query();

		while (serviceConfigItemAssocGr.next())
			impactedServices[serviceConfigItemAssocGr.service_id + ""] = null;

		return Object.keys(impactedServices);
	},

   type: 'CIUtils'

};
```