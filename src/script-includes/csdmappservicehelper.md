---
title: "CSDMAppServiceHelper"
id: "csdmappservicehelper"
---

API Name: global.CSDMAppServiceHelper

```js
var CSDMAppServiceHelper = Class.create();
CSDMAppServiceHelper.prototype = {
    initialize: function() {
    },

	CMDB_REL_CI : "cmdb_rel_ci",
    CONSUMES_REL_TYPE : "41008aa6ef32010098d5925495c0fb94", // Bus application -> consumes -> Application Service
    DEPENDS_REL_TYPE : "1a9cb166f1571100a92eb60da2bce5c5", // Bus svc offering -> depends on  -> Application Service
    CONTAINS_REL_TYPE : "55c95bf6c0a8010e0118ec7056ebc54d", // Tech svc offering -> contains  -> Application Service
    APP_SERVICE_BASIC_MANDATORY_FIELDS : 'glide.cmdb.csdm.app_service.basic.mandatory_values',
    APP_SERVICE_RELATIONSHIP_MANDATORY_FIELDS : 'glide.cmdb.csdm.app_service.relationship.mandatory_values',
    PREDEFINED_APPLICATION_TYPES: {
		"web_application_card": "cmdb_ci_endpoint_http",
		"exchange_card": "cmdb_ci_endpoint_http",
		"citrix_card": "cmdb_ci_endpoint_xenapp",
		"sap_card": "cmdb_ci_endpoint_http",
		"sharepoint_card": "cmdb_ci_endpoint_http",
		"mq_card": "cmdb_ci_endpoint_mq",
		"ems_card": "cmdb_ci_endpoint_ems",
		"biztalk_card": "cmdb_ci_endpoint_biztalk",
		"tcp_card": "cmdb_ci_endpoint_tcp"},
	
	PREDEFINED_APPLICATION_TYPES_DISPLAY_NAME: {
		"web_application_card": "Web Application",
		"exchange_card": "Microsoft Exchange",
		"citrix_card": "Citrix XenApp",
		"sap_card": "SAP Application",
		"sharepoint_card": "Microsoft SharePoint",
		"mq_card": "IBM WebSphere MQ",
		"ems_card": "Tibco EMS",
		"biztalk_card": "Microsoft Biztalk",
		"tcp_card": "Generic Application"},

    createRelationship : function(parent, child, type){
        var gr = new GlideRecord(this.CMDB_REL_CI);
        gr.setValue("parent", parent);
        gr.setValue("child", child);
        gr.setValue("type", type);
        return gr.insert();
    },

    createPayload: function (table, inputValues) {
      var payload = {};
      var items = [];
      var relations = [];
      payload['items'] = items;
      payload['relations'] = relations;

      var item = {};
      items.push(item);
      item['className'] = table;

      var values = {};
      item['values'] = values;
      var keys = Object.keys(inputValues);
      for(var i=0; i< keys.length; i++){
        values[keys[i]] = inputValues[keys[i]];
      }

      var input = JSON.stringify(payload); 
      var jsonUntil = new JSON();
      return jsonUntil.encode(payload);
    },

    createOrUpdateService: function (table, inputValues) {
      var input = this.createPayload(table, inputValues);
      var output = SNC.IdentificationEngineScriptableApi.createOrUpdateCI('Manual Entry', input);
      return JSON.parse(output);
    },

    identifyService: function (table, inputValues) {
      var input = this.createPayload(table, inputValues);
      var output = SNC.IdentificationEngineScriptableApi.identifyCI(input);
      return JSON.parse(output);
    },

    createService: function (table, values) {
      values['service_classification'] = 'Application Service';
      var output = this.createOrUpdateService(table, values);
      if(output.items.length > 0 && output.items[0].errorCount > 0) {
        return '';
      }
      return output.items[0].sysId;
    },

    updateService: function(table, sysId, values) {
      var correctTable = '';
      if (JSUtil.nil(table)) {
        var gr_temp = new GlideRecord('cmdb_ci_service');
        if (gr_temp.get(sysId))
        correctTable = gr_temp.getValue('sys_class_name');
      }
      else{
        correctTable = table;
      }
      values['sys_id'] = sysId;

      var output = this.createOrUpdateService(correctTable, values);
      if(output.items.length > 0 && output.items[0].errorCount > 0) {
        return '';
      }
      return output.items[0].sysId;
    },

    createServiceFromTagCandidate: function (candidateId, serviceDetails) {
      var basic_details = serviceDetails.basic_details;
      var output = this.identifyService('cmdb_ci_service_auto', basic_details);
      if(output.items.length > 0 && output.items[0].errorCount > 0) {
        return '';
      }
      var tagUtils = new SMServiceByTagsUtils();
      var serviceId = tagUtils.createServiceFromCandId(candidateId, basic_details);
      var gr = new GlideRecord('cmdb_ci_service_by_tags');
      gr.addQuery('sys_id', serviceId);
      gr.query();
      if (!gr.next()) {
        return '';
      }
      gr.setValue('comments', serviceDetails.build_methods[0].comments);
      gr.update();
      return serviceId;
    },

    createServiceFromTagList: function (basic_details, tagList) {
      var output = this.identifyService('cmdb_ci_service_auto', basic_details);
      if(output.items.length > 0 && output.items[0].errorCount > 0) {
        return '';
      }
      var tagUtils = new SMServiceByTagsUtils();
      var serviceId = tagUtils.createServiceFromTagsList(tagList.tags, basic_details);
      var gr = new GlideRecord('cmdb_ci_service_by_tags');
      gr.addQuery('sys_id', serviceId);
      gr.query();
      if (!gr.next()) {
        return '';
      }
      gr.setValue('comments', tagList.comments);
      gr.update();
      return serviceId;
    },

    createDiscoveredService: function(serviceDetails, serviceId) {
		if (JSUtil.nil(serviceId)) {
			serviceId = this.createService('cmdb_ci_service_discovered', serviceDetails.basic_details);
		} else {
			var gr = new GlideRecord('cmdb_ci_service');
			gr.addQuery('sys_id', serviceId);
			gr.query();
			if (!gr.next()) {
				return '';
			}
			var className = gr.getValue('sys_class_name');
			if (className != 'cmdb_ci_service_discovered') {
				gr.setValue('sys_class_name', 'cmdb_ci_service_discovered');
				gr.update();
			}
		}

		if (JSUtil.nil(serviceId)) {
			return '';
		}

		return serviceId;
    },

    createDiscoveryEntryPoint: function(buildMethod, serviceId) {
		var endpointTableName = buildMethod.application_type;
		var gr = new GlideRecord('sys_db_object');
		gr.addQuery('name', buildMethod.entry_point_id);
		gr.query();
		if (gr.next()) {
			endpointTableName = gr.getValue('label');
		}
		
		var entryPoint = {};
		entryPoint.id = buildMethod.endpoint_id;
		entryPoint.name = endpointTableName;
		entryPoint.uiCardType = (this.PREDEFINED_APPLICATION_TYPES[buildMethod.application_type]) ? null : buildMethod.application_type;
		entryPoint.uiCardName = buildMethod.applicationTypeLabel;
		entryPoint.type = buildMethod.entry_point_id;
		entryPoint.created = Date.now() + '';
		entryPoint.parameters = {};
		buildMethod.attributes.forEach(function(attr) {
			entryPoint.parameters[attr.name] = attr.value;
		});

		return entryPoint;
    },

    createManualEntryPoint: function(buildMethod, serviceId) {
		var entryPoint = {};
		entryPoint.id = buildMethod.endpoint_id;
		entryPoint.name = buildMethod.ci_label;
		entryPoint.uiCardName = 'Manually Added CI';
		entryPoint.type = 'cmdb_ci_endpoint_manual';
		entryPoint.created = Date.now() + '';
		entryPoint.parameters = {};
		entryPoint.parameters.target_ci = buildMethod.ci_id;
		entryPoint.parameters.target_ci_type = buildMethod.class_name;
		entryPoint.parameters.name = buildMethod.ci_label;
		
		return entryPoint;
    },

    createApplicationService: function(serviceDetails) {
		if( !this.basicMandatoryFieldsExists(serviceDetails.basic_details) || !this.relationshipMandatoryFieldsExists(serviceDetails.relationships)) {
			return '';
		}

		var serviceId = '';
		if (serviceDetails.basic_details.service_id) {
			serviceId = serviceDetails.basic_details.service_id;
		}

		//determine which type of service should be created.
		//for no build out methods, a plain monitored service will be created.
		if(JSUtil.nil(serviceDetails.build_methods) && JSUtil.nil(serviceId)){
			serviceId = this.createService("cmdb_ci_service_auto", serviceDetails.basic_details);
			return serviceId;
		}

		if(serviceDetails.build_methods.length === 1 && serviceDetails.build_methods[0].type === 'tag_based_service_family') { // Tag based services
			
			serviceId = this.createServiceFromTagCandidate(serviceDetails.build_methods[0].service_candidate, serviceDetails);
		
		} else if(serviceDetails.build_methods.length === 1 && serviceDetails.build_methods[0].type === 'tag_list') { // Tag list
			
			serviceId = this.createServiceFromTagList(serviceDetails.basic_details, serviceDetails.build_methods[0]);
			
		} else if (serviceDetails.build_methods.length === 1 && serviceDetails.build_methods[0].type === 'cmdb_group') { // Group based service
			var group_sys_id = serviceDetails.build_methods[0].group_id;
			if(JSUtil.notNil(this.getServiceForCMDBGroup(group_sys_id))) {
				return {statusCode: 400, error : gs.getMessage("This group is already associated with an application service: {0}", group_sys_id)};
			}
			serviceId = this.createServiceFromCMDBGroup(serviceDetails);
			
		} else { // Discovery and manual combo
			
			var isUpdate = false;
			if (serviceId) {
				isUpdate = true;
			}
			serviceId = this.createDiscoveredService(serviceDetails, serviceId);
			var model = {};
			model.id = serviceId;
			model.className = 'cmdb_ci_service_discovered';
			model.isLeafDomain = 'true';
			model.hasFullServiceFormAccess = 'true';
			model.removedEntryPoints = serviceDetails.removed_entry_points;
			model.entryPoints = [];
			for (var i = 0; i < serviceDetails.build_methods.length; i++) {
				var entryPoint = null;
				if (serviceDetails.build_methods[i].type === 'discovery') {
					entryPoint = this.createDiscoveryEntryPoint(serviceDetails.build_methods[i], serviceId);
				} else if (serviceDetails.build_methods[i].type === 'manual') {
					entryPoint = this.createManualEntryPoint(serviceDetails.build_methods[i], serviceId);
				}
				model.entryPoints.push(entryPoint);
			}
			
			(new SNC.BusinessServiceManager()).updateBusinessService(JSON.stringify(model));
			
			var gr = new GlideRecord('sa_m2m_service_entry_point');
			gr.addQuery('cmdb_ci_service', serviceId);
			gr.query();
			while (gr.next()) {
				var endpointId = gr.getValue('cmdb_ci_endpoint');
				var endpointGr = new GlideRecord('cmdb_ci_endpoint_manual');
				endpointGr.addQuery('sys_id', endpointId);
				endpointGr.query();
				if (endpointGr.next()) {
					var targetCI = endpointGr.getValue('target_ci');
					for (var j = 0; j < serviceDetails.build_methods.length; j++) {
						var method = serviceDetails.build_methods[j];
						if (targetCI == method.ci_id) {
							endpointGr.setValue('comments', method.comments);
							endpointGr.update();
							break;
						}
					}
				}
			}
			
			if (isUpdate) {
				serviceId = this.updateService('cmdb_ci_service_discovered', serviceId, serviceDetails.basic_details);
			}
		}
		
		return serviceId;
    },

	createCSDMRelationships: function(svcId, relationships) {
		if(!svcId)
			return;
		this.createBizSvcOfferingRels(svcId, relationships.business_service_offering);
		this.createTechSvcOfferingRels(svcId, relationships.technical_service_offering);
		this.createBizAppRels(svcId, relationships.business_app);
	},

	createBizSvcOfferingRels: function(serviceId, rels) {
		for(var i=0; i< rels.length; i++){
			this.createRelationship(rels[i], serviceId, this.DEPENDS_REL_TYPE);
		}
	},

	createTechSvcOfferingRels: function(serviceId, rels) {
		for(var i=0; i< rels.length; i++){
			this.createRelationship(rels[i], serviceId, this.CONTAINS_REL_TYPE);
		}
	},

	createBizAppRels: function(serviceId, rels) {
		for(var i=0; i< rels.length; i++){
			this.createRelationship(rels[i], serviceId, this.CONSUMES_REL_TYPE);
		}
	},
    alreadyExists: function (basic_details) {
		if (!basic_details.name && !basic_details.number)
			return;
		
		if (basic_details.name) {
			var existingSysId = '';
			var error = null;
		
			var output = this.identifyService('cmdb_ci_service_auto', basic_details);
			if (output.items.length > 0 && output.items[0].sysId && output.items[0].sysId !== basic_details.service_id) {
				error = gs.getMessage("The name in Basic Details is already in use, please provide a different name.");
				return {existingService: output.items[0].sysId, error: error };
			}
		}
		
		if (basic_details.number) {
			gr = new GlideRecord('cmdb_ci_service');
			gr.addQuery('number', basic_details.number);
			if(basic_details.service_id)
				gr.addQuery('sys_id', 'NOT IN', basic_details.service_id);
			gr.query();
			if(gr.next()){
				existingSysId = gr.getValue('sys_id');
			
				error = gs.getMessage("The number specified is already in use. Please specify a different value.");
				return {existingService: existingSysId, error: error };
			}
		}

        return;
    },

    basicMandatoryFieldsExists: function (basic_details) {
      var mandatoryFields = gs.getProperty(this.APP_SERVICE_BASIC_MANDATORY_FIELDS, '');
      if(mandatoryFields == ''){
        return true;
      }
      mandatoryFields = mandatoryFields.split(',');
      for(var i=0; i < mandatoryFields.length; i++) {
        if(!basic_details[mandatoryFields[i]])
        return false;
      }
      return true;
    },

    relationshipMandatoryFieldsExists: function (relationships) {
      var mandatoryFields = gs.getProperty(this.APP_SERVICE_RELATIONSHIP_MANDATORY_FIELDS, '');
      if(mandatoryFields == ''){
        return true;
      }
      mandatoryFields = mandatoryFields.split(',');
      for(var i=0; i < mandatoryFields.length; i++) {
        if(relationships[mandatoryFields[i]].length == 0)
        return false;
      }
      return true;
    },

	createAppServiceInfoRequest: function(assigned_to, serviceId, description){
		var gr = new GlideRecord("service_process_task");
		//check that the table exists, it is created by disco
		if(gr.isValid()){
			var map = global.SaViewServiceMap();
			gr.setValue("type", 0);
			gr.setValue("assigned_to", assigned_to);
			gr.setValue("business_service", serviceId);

			gr.setValue("description", description);
			gr.setValue("map_url", map.getMapUrl(serviceId, true));
			return gr.insert();
		}
	},

	updateCSDMRel: function (serviceId, relations) {
		// Create new relations if does not exist already
		if(!JSUtil.nil(relations.business_app)) {
			var bAppRels = [];
			for(var i in relations.business_app) {
				if(!this.relExists(relations.business_app[i], serviceId, this.CONSUMES_REL_TYPE))
					bAppRels.push(relations.business_app[i]);
			}
			this.createBizAppRels(serviceId, bAppRels);
		}

		if(!JSUtil.nil(relations.business_service_offering)) {
			var bsoRels = [];
			for(var i in relations.business_service_offering) {
				if(!this.relExists(relations.business_service_offering[i], serviceId, this.DEPENDS_REL_TYPE))
					bsoRels.push(relations.business_service_offering[i]);
			}
			this.createBizSvcOfferingRels(serviceId, bsoRels);
		}

		if(!JSUtil.nil(relations.technical_service_offering)) {
			var tsoRels = [];
			for(var i in relations.technical_service_offering) {
				if(!this.relExists(relations.technical_service_offering[i], serviceId, this.CONTAINS_REL_TYPE))
					tsoRels.push(relations.technical_service_offering[i]);
			}
			this.createTechSvcOfferingRels(serviceId, tsoRels);
		}

		// Delete relations which are not in the input payload
		var deleteRelsArray = this.getToBeDeletedRels(serviceId, relations);
		if(JSUtil.notNil(deleteRelsArray)) {
			gs.warn('Deleting relations for Application Service sys_id : ' + serviceId + 'as they do not conform with CSDM:' + deleteRelsArray);
			this.deleteRels(deleteRelsArray);
		}
	},

	// For a given application Service if CSDM specified relationship does not exist then get those for deletion
	getToBeDeletedRels: function(serviceId, relations) {
		var newRels = [];
		var markForDeletion = [];
		var keys = Object.keys(relations);
		for(var i=0; i<keys.length; i++) {
			newRels = newRels.concat(relations[keys[i]]);
		}

		var gr = new GlideRecord(this.CMDB_REL_CI);
		gr.addQuery('child', serviceId);
		gr.addQuery('parent.sys_class_name', 'IN', ['cmdb_ci_business_app']);
		gr.query();
		while(gr.next()) {
			var indexRemove = newRels.indexOf(gr.getValue('parent'));
			if(indexRemove < 0) // not found in new relations to be created then delete that relation
				markForDeletion.push(gr.getValue('sys_id'));
		}
		
		gr = new GlideRecord('cmdb_rel_ci');
		gr.addQuery('child', serviceId);
		gr.addQuery('parent.sys_class_name', 'IN', ['service_offering']);
		gr.addEncodedQuery('service_classification' + "=" + 'business_service' + "^OR" + 'service_classification' + "=" + 'technical_service');
		gr.query();
		while(gr.next()) {
			var indexRemove = newRels.indexOf(gr.getValue('parent'));
			if(indexRemove < 0) // not found in new relations to be created then delete that relation
				markForDeletion.push(gr.getValue('sys_id'));
		}

		return markForDeletion;
	},

	relExists: function (parent, child, type) {
		var relId = '';
		var gr = new GlideRecord(this.CMDB_REL_CI);
		gr.addQuery('parent', parent);
		gr.addQuery('child', child);
		gr.addQuery('type', type);
		gr.query();
		if(gr.next()) {
			relId = gr.getValue('sys_id');
		}
		return relId;
	},
	deleteRels: function(rels) {
		var gr = new GlideRecord(this.CMDB_REL_CI);
		gr.addQuery('sys_id','IN' ,rels);
		gr.query();
		gr.deleteMultiple();
	},

	validateBuildMethods: function(serviceId, build_methods) {
		var gr = new GlideRecord('cmdb_ci_service_auto');
		if(!gr.get(serviceId)) {
			return false;
		}
		if(JSUtil.nil(build_methods)) // No change in build method
			return true;

		var serviceClass = gr.getValue('sys_class_name');
		switch(serviceClass) {
			case 'cmdb_ci_service_auto':
				return true;
			case 'cmdb_ci_service_calculated':
				return build_methods.length == 1 && build_methods[0].type === 'converted_business_service';
			case 'cmdb_ci_query_based_service':
				return build_methods.length == 1 && build_methods[0].type === 'cmdb_group';
			case 'cmdb_ci_service_discovered':
				var validTypes = ['discovery', 'manual'];
				if(build_methods.length <= 2) {
					if(validTypes.indexOf(build_methods[0].type) > -1 )
						return (JSUtil.nil(build_methods[1]) || validTypes.indexOf(build_methods[1].type) > -1);
				}
				return false;
			case 'cmdb_ci_service_by_tags':
				return build_methods[0].type === 'tag_based_service_family' || build_methods[0].type === 'tag_list';
		}
		return false;
	},

	updateBuildMethod: function(serviceId, buildMethods) {
		var gr = new GlideRecord('cmdb_ci_service');
		gr.get(serviceId);
		if(gr.getValue('sys_class_name') == 'cmdb_ci_service_auto') {
			gr.setValue('sys_class_name', this.getClassForBM(buildMethods[0].type));
			gr.update();
		}
		switch(buildMethods[0].type) {
			case 'cmdb_group':
				if(gr.getValue('sys_class_name') == 'cmdb_ci_query_based_service') {
					var otherServiceSysId = this.getServiceForCMDBGroup(buildMethods[0].group_id);
					if(JSUtil.notNil(otherServiceSysId) && otherServiceSysId !== serviceId) {
						return {statusCode: 400, error: gs.getMessage("This group is already associated with an application service: {0}", buildMethods[0].group_id)};
					}
					var grGroup = new GlideRecord('cmdb_ci_query_based_service');
					grGroup.get(serviceId);
					grGroup.setValue('cmdb_group', buildMethods[0].group_id);
					grGroup.setValue('comments', buildMethods[0].comments);
					grGroup.update();
				}
				break;
			case 'tag_list':
				var tagUtils = new SMServiceByTagsUtils();
				tagUtils.updateServiceFromTagsList(serviceId, buildMethods[0].tags, null);
				break;
			case 'tag_based_service_family':
				var tagUtils = new SMServiceByTagsUtils();
				tagUtils.updateServiceFromCandId(serviceId, buildMethods[0].service_candidate, null);
				break;
		}
	},

	getClassForBM: function(bm) {
		switch(bm) {
			case 'cmdb_group':
				return 'cmdb_ci_query_based_service';
			case 'tag_list':
				return 'cmdb_ci_service_by_tags';
			case 'tag_based_service_family':
				return 'cmdb_ci_service_by_tags';
			case 'discovery':
				return 'cmdb_ci_service_discovered';
			case 'manual':
				return 'cmdb_ci_service_discovered';
			default:
				return 'cmdb_ci_service_auto';

		}
  },
	getParamAsString: function(paramName) {
		if (request.queryParams.hasOwnProperty(paramName))
			return request.queryParams[paramName] + '';
		return '';
	},

	getApplicationService: function(id) {
		var result = {};
		var gr = new GlideRecord('cmdb_ci_service_auto');
		gr.addQuery('sys_id', id);
		gr.query();
		if (!gr.next()) {
			return '';
		}

		// Basic Details
		result.service_details = {};
		result.service_details.basic_details = this.getBasicDetails(gr);

		// Build Methods
		var className = gr.getValue('sys_class_name');
		switch (className) {
			case 'cmdb_ci_service_discovered':
				result.service_details.build_methods = this.getDiscoveryAndManualMethods(id);
				break;
			case 'cmdb_ci_query_based_service':
				result.service_details.build_methods = this.getGroupMethod(id);
				break;
			case 'cmdb_ci_service_by_tags':
				result.service_details.build_methods = this.getTagMethod(id);
				break;
			case 'cmdb_ci_service_calculated':
				result.service_details.build_methods = this.getConvertedMethod(id);
				break;
		}

		// Relations
		result.service_details.relationships = {};
		result.service_details.relationships.business_app = [];
		result.service_details.relationships.technical_service_offering = [];
		result.service_details.relationships.business_service_offering = [];
		gr = new GlideRecord(this.CMDB_REL_CI);
		gr.addQuery('child', id);
		gr.query();
		while (gr.next()) {
			var relType = gr.getValue('type');
			var parent = gr.getValue('parent');
			var parentClassName = gr.parent.sys_class_name;
			var parentOfferType = gr.parent.service_classification;
			if (relType == this.CONSUMES_REL_TYPE && parentClassName == 'cmdb_ci_business_app') {
				result.service_details.relationships.business_app.push(parent);
			} else if (relType == this.DEPENDS_REL_TYPE && parentClassName == 'service_offering' && parentOfferType == 'Business Service') {
				result.service_details.relationships.business_service_offering.push(parent);
			} else if (relType == this.CONTAINS_REL_TYPE && parentClassName == 'service_offering' && parentOfferType == 'Technical Service') {
				result.service_details.relationships.technical_service_offering.push(parent);
			}
		}

		// Get view map details
		result.service_details.view_map_url = this.getViewMapUrl(id);

		return result;
	},

	getBasicDetails: function(gr) {
		var details = {};
		details.service_id = gr.getValue('sys_id');
		details.name = gr.getValue('name');
		details.sys_class_name = gr.getValue('sys_class_name');
		details.environment = gr.getValue('environment');
		details.version = gr.getValue('version');
		details.model_id = {};
		details.model_id.sys_id = gr.getValue('model_id');
		details.model_id.display_value = gr.model_id.display_name;
		details.life_cycle_stage = gr.getValue('life_cycle_stage');
		details.life_cycle_stage_status = gr.getValue('life_cycle_stage_status');
		details.busines_criticality = gr.getValue('busines_criticality');
		details.support_group = {};
		details.support_group.sys_id = gr.getValue('support_group');
		details.support_group.display_value = gr.support_group.name;
		details.assignment_group = {};
		details.assignment_group.sys_id = gr.getValue('assignment_group');
		details.assignment_group.display_value = gr.assignment_group.name;
		details.change_control = {};
		details.change_control.sys_id = gr.getValue('change_control');
		details.change_control.display_value = gr.change_control.name;
		details.managed_by_group = {};
		details.managed_by_group.sys_id = gr.getValue('managed_by_group');
		details.managed_by_group.display_value = gr.managed_by_group.name;
		details.owned_by = {};
		details.owned_by.sys_id = gr.getValue('owned_by');
		details.owned_by.display_value = gr.owned_by.name;
		details.operational_status = gr.getValue('operational_status');
		details.number = gr.getValue('number');
		return details;
	},

	getConvertedMethod: function(id) {
		var methods = [];
		var method = {};
		
		method.type = 'converted_business_service';
		method.endpoints = this.getDiscoveryAndManualMethods(id);
		
		var gr = new GlideRecord('cmdb_ci_service_calculated');
		gr.addQuery('sys_id', id);
		gr.query();
		if (!gr.next()) {
			return methods;
		}
		method.service_type = gr.getDisplayValue('type');
		var metadata = JSON.parse(gr.getValue('metadata'));
		method.level = metadata.levels + '';

		gr = new GlideRecord('cmdb_convert_bulk_services_entry');
		gr.addQuery('service', id);
		gr.query();
		if (gr.next()) {
			var convertId = gr.getValue('bulk_transform');
			var gr2 = new GlideRecord('cmdb_convert_bulk_services');
			gr2.addQuery('sys_id', convertId);
			gr2.query();
			if (gr2.next()) {
				method.converted_on = gr.getValue('sys_created_on');
			}
		}

		methods.push(method);
		return methods;
	},

	getGroupMethod: function(id) {
		var methods = [];
		var method = {};
		var gr = new GlideRecord('cmdb_ci_query_based_service');
		gr.addQuery('sys_id', id);
		gr.query();
		if (!gr.next()) {
			return methods;
		}
		method.type = 'cmdb_group';
		method.group_id = gr.getValue('cmdb_group');
		method.group_name = gr.cmdb_group.group_name;
		method.comments = gr.getValue('comments');
		methods.push(method);
		return methods;
	},

	getTagMethod: function(id) {
		var methods = [];
		var method = {};
		var gr = new GlideRecord('cmdb_ci_service_by_tags');
		gr.addQuery('sys_id', id);
		gr.query();
		if (!gr.next()) {
			return methods;
		}
		method.comments = gr.getValue('comments');
		method.tag_family = gr.getValue('service_family');
		if(JSUtil.nil(method.tag_family)){
			method.type = 'tag_list';
			method.tags = [];
			var metadata = JSON.parse(gr.getValue('metadata'));
			for(var i=0; i< metadata.category_values.length; i++){
				method.tags.push({tag: metadata.category_values[i].category,
									value: metadata.category_values[i].value});
			}
		} else {
			method.type = 'tag_based_service_family';
			method.tagBasedFamilyName = gr.service_family.name;
			gr = new GlideRecord('svc_by_tags_candidates');
			gr.addQuery('service_family', method.tag_family);
			gr.addQuery('actual_service', id);
			gr.query();
			if (!gr.next()) {
				return methods;
			}
			method.service_candidate = gr.getValue('sys_id');
			method.serviceCandidateName = gr.getValue('service_name');
		}
		methods.push(method);
		return methods;
	},

  getDiscoveryAndManualMethods: function(id) {
    var methods = [];
    var gr = new GlideRecord('sa_m2m_service_entry_point');
    gr.addQuery('cmdb_ci_service', id);
    gr.query();
    while (gr.next()) {
		var method = {};
		var type = gr.cmdb_ci_endpoint.sys_class_name + '';
		var endpointId = gr.getValue('cmdb_ci_endpoint');
		
		if (type == 'cmdb_ci_endpoint_manual') {
			
			method.type = 'manual';
			method.class_name = gr.cmdb_ci_endpoint.target_ci.sys_class_name + '';
			method.ci_label = gr.cmdb_ci_endpoint.target_ci.name + '';
			method.ci_id = gr.cmdb_ci_endpoint.target_ci.sys_id + '';
			method.comments = gr.cmdb_ci_endpoint.comments + '';
			method.endpoint_id = endpointId;
			
		} else {
			var entryId = gr.getValue('sys_id');
			
			method.type = 'discovery';
			method.application_type = this.getDiscoveryApplicationType(entryId);
			if (!method.application_type) {
				method.application_type = type;
			}
			method.entry_point_id = this.PREDEFINED_APPLICATION_TYPES[method.application_type] ?
			this.PREDEFINED_APPLICATION_TYPES[method.application_type] : method.application_type;
			
			if (method.application_type == method.entry_point_id) {
				var td = GlideTableDescriptor.get(method.entry_point_id);
				method.applicationTypeLabel = td.getED().getLabel();
			} else {
				method.applicationTypeLabel = this.PREDEFINED_APPLICATION_TYPES_DISPLAY_NAME[method.application_type];
			}
			
			method.attributes = this.getDiscoveryAttributes(endpointId, method.entry_point_id);
			method.endpoint_id = endpointId;
			
			var hasComments = false;
			for (var i = 0; i < method.attributes.length; i++) {
				if (method.attributes[i].name == 'comments') {
					hasComments = true;
					break;
				}
			}
			if (!hasComments) {
				method.attributes.push({
					name: 'comments',
					value: gr.cmdb_ci_endpoint.comments + ''
				});
			}
		}
		methods.push(method);
    }
    return methods;
  },

	getDiscoveryApplicationType: function(entryId) {
		var gr = new GlideRecord('sa_entry_point_ui_card');
		gr.addEncodedQuery('service_entry_point.sys_id=' + entryId);
		gr.query();
		if (!gr.next()) {
			return '';
		}
		return gr.getValue('ep_card_id');
	},

	getDiscoveryAttributes: function(endpointId, table) {
		var attributes = [];
		
		var gr = new GlideRecord(table);
		gr.addQuery('sys_id', endpointId);
		gr.query();
		if (!gr.next()) {
			return attributes;
		}
		var manager = new SNC.EntryPointSelectorManager();
		var fields = manager.getEntryPointTypeFields(table);
		fields = JSON.parse(fields.toString().replace('SimpleCITypeAttributeDTO', '').replace('name=', '\'name\':').replace('description=', '\'description\':').replace('id=', '\'id\':').replace('\'', '"'));
		for (var i = 0; i < fields.length; i++) {
			var field = fields[i];
			var attr = {};
			attr.name = field.name;
			attr.value = gr.getValue(attr.name);
			attributes.push(attr);
		}
		return attributes;
	},

	getViewMapUrl: function(serviceId){
		var map = new global.SaViewServiceMap();
		var svcMapUrl =  map.getMapUrl(serviceId, true);
		var baseUrl = svcMapUrl.url;
		return baseUrl + '&sysparm_service_source=csdm';
	},
	createServiceFromCMDBGroup: function(serviceDetails) {
		var model = serviceDetails.basic_details;
		model.cmdb_group = serviceDetails.build_methods[0].group_id;
		model.comments = serviceDetails.build_methods[0].comments;
		return this.createService('cmdb_ci_query_based_service', model);
	},

	getServiceForCMDBGroup: function(groupId) {
		var gr = new GlideRecord('cmdb_ci_query_based_service');
		gr.addQuery('cmdb_group', groupId);
		gr.query();
		if (gr.next()) {
			return gr.getValue('sys_id');
		}
		return '';
	},

	deleteApplicationService: function(id) {
		var gr = new GlideRecord('cmdb_ci_service_auto');
		gr.addQuery('sys_id', id);
		gr.query();
		if (!gr.next()) {
			return false;
		}

		return this.deleteRecord('cmdb_ci_service_auto', id);
	},

	deleteRecord: function(table, id) {
		var gr = new GlideRecord(table);
		gr.addQuery('sys_id', id);
		gr.query();
		if (gr.next()) {
			if (!gr.deleteRecord()) {
				return false;
			}
		}
		return true;
	},

    type: 'CSDMAppServiceHelper'
};

```