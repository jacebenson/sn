---
title: "RecipientsListApi"
id: "recipientslistapi"
---

API Name: sn_publications.RecipientsListApi

```js
var RecipientsListApi = Class.create();
RecipientsListApi.prototype = {
    initialize: function() {
		 this.processedRecipients = {};
	},

    _mergeArraySet: function(destArr, sourceArr) {
        var arrSet = {};
        for (var i = 0; i < destArr.length; ++i) {
            arrSet[destArr[i]] = true;
        }
        for (var j = 0; j < sourceArr.length; ++j) {
            arrSet[sourceArr[j]] = true;
        }
        destArr.splice(0);
        for (var k in arrSet) {
            if (arrSet.hasOwnProperty(k)) {
                destArr.push(k);
            }
        }
        return destArr;
    },

    _isValidRecord: function(reftable, entitySysId) {
        var m2mTypeGr = new GlideRecord(reftable);
        var isValid;
        if (m2mTypeGr.get(entitySysId)) {
            isValid = true;
            if (reftable == 'sys_user' && m2mTypeGr.sys_class_name != 'sys_user') 
				isValid = false;
        }
        return isValid;
    },

    _checkM2MRecordExists: function(recListSysId, entityParams, entitySysId) {
        var recipientsGr = new GlideRecord(entityParams["table"]);
        recipientsGr.addQuery('recipients_list', recListSysId);
        recipientsGr.addQuery(entityParams["field"], entitySysId);
        recipientsGr.query();
        return (recipientsGr.hasNext());
    },

    _insertM2MRecord: function(recListSysId, entityParams, entitySysId, isDynamicUpload, validCheck) {
        var recipientsGr = new GlideRecord(entityParams["table"]);

        if (validCheck && !this._isValidRecord(entityParams["reftable"], entitySysId)) return;
		
		if (this._checkM2MRecordExists(recListSysId,entityParams,entitySysId)) return;

        recipientsGr.setValue('recipients_list', recListSysId);
        recipientsGr.setValue(entityParams["field"], entitySysId);
        recipientsGr.setValue('dynamically_added', isDynamicUpload);
        recipientsGr.insert();
    },

    _deleteM2MRecord: function(tableName, recipientsListSysId) {
        var recipientsGr = new GlideRecord(tableName);
        recipientsGr.addQuery('recipients_list', recipientsListSysId);
		recipientsGr.addQuery('dynamically_added', true);
        recipientsGr.deleteMultiple();
    },

    _updateRecord: function(recipientsListGr) {
        recipientsListGr.setValue('state', 2);
        recipientsListGr.setValue('percentage', 100);
        recipientsListGr.update();
    },

    _getRecipientListMetaData: function(recListSysId) {
        var recListGr = new GlideRecord("sn_publications_recipients_list");
        var type, tableName, fieldName, refTable;
        var entityMetaData = {};
		var classCheck = true;
        if (!recListGr.get(recListSysId)) return entityMetaData;
        type = recListGr.type;

        if (type == "external" || type == "internal") {
            tableName = "sn_publications_recipientslist_user_m2m";
            fieldName = "user";
            refTable = "sys_user";
            if (type == "external")
                refTable = "customer_contact";
        } else if (type == "consumers") {
            tableName = "sn_publications_recipientslist_consumer_m2m";
            fieldName = "consumer";
            refTable = "csm_consumer";
			classCheck = false;
        } else if (type == "accounts") {
            tableName = "sn_publications_recipientslist_account_m2m";
            fieldName = "account";
            refTable = "customer_account";
        }
        entityMetaData["table"] = tableName + "";
        entityMetaData["field"] = fieldName + "";
        entityMetaData["reftable"] = refTable + "";
		entityMetaData["classCheck"] = classCheck;
        return entityMetaData;

    },

    _checkRecipientExists: function(table, targetListGr, targetField, targetSet, classCheck) {
        var sysId;
        //Fail if the filter is not returning valid sysIds
        var tgr = new GlideRecord(table);
        if (!targetListGr.getElement(targetField) || targetListGr.getElement(targetField).nil())
            return;
        sysId = targetListGr.getElement(targetField).toString();
        if (targetSet[sysId])
            return;
        if (!tgr.get(sysId) || (classCheck && tgr.getValue('sys_class_name') != table)) {
            gs.error("RecipientsListApi::buildRecipientsList Skipping Invalid sysId:" + sysId);
            return;
        }
        targetSet[sysId] = true;
    },

    _clearM2MRecords: function(recipientsListSysId, isCSMActive) {
        this._deleteM2MRecord("sn_publications_recipientslist_user_m2m", recipientsListSysId);
        if (isCSMActive) {
            this._deleteM2MRecord("sn_publications_recipientslist_consumer_m2m", recipientsListSysId);
            this._deleteM2MRecord("sn_publications_recipientslist_account_m2m", recipientsListSysId);
        }
    },
	
	_getManualM2MRecords: function(recipientsListSysId, m2mMeta) {
		var recipientsGr = new GlideRecord(m2mMeta['table']);
		var m2mField = m2mMeta['field'];
		var records = [];
        recipientsGr.addQuery('recipients_list', recipientsListSysId);
        recipientsGr.addQuery('dynamically_added', false);
		recipientsGr.addQuery('active_communication', true);
		recipientsGr.query();
		while(recipientsGr.next())
			records.push(recipientsGr.getValue(m2mField));
		return records;
	},

    _evaluateRecipientListScript: function(recipientsListGr, args) {
        var recListObj = {};
        var entityType;
        var evaluator = new GlideScopedEvaluator();
        recListObj = evaluator.evaluateScript(recipientsListGr, "script", args);
        entityType = Object.keys(recListObj);
        if (!entityType.length) return {};
        return recListObj;
    },

    _processScriptedRecipients: function(recListSysId, entityType, entityList, isDynamicUpload) {
        var recipientsListGr = new GlideRecord('sn_publications_recipients_list');

        if (!recipientsListGr.get(recListSysId)) return;

        if (gs.nil(isDynamicUpload))
            isDynamicUpload = false;
        var recipientsGr;
        var entityParams = this._getRecipientListMetaData(recListSysId);
        for (var i = 0; i < entityList.length; i++) {
            if (!this._checkM2MRecordExists(recListSysId, entityParams, entityList[i]))
                this._insertM2MRecord(recListSysId, entityParams, entityList[i], isDynamicUpload, true);
        }
        this._updateRecord(recipientsListGr);
    },
	
	sendEmailViaEvent: function(publicationGr){
		var isCSMActive = GlidePluginManager.isActive('com.sn_customerservice');
		var notificationID = "5c30ae8993901300ac40f5be867ffbf4";
		if(!isCSMActive){
			var toAddr = this._getToAddress();
			if(toAddr != ''){
				gs.eventQueue("sn_publications.createEmail", publicationGr, toAddr);
				publicationGr.notification = notificationID;
				publicationGr.update();
			}
		}
	},

    buildRecipientsListForScript: function(recipientsListGr, skipInsert, args) {
        var isCSMActive = GlidePluginManager.isActive('com.sn_customerservice');

        var recListObj = this._evaluateRecipientListScript(recipientsListGr, args);
        var entityType = Object.keys(recListObj);

        if (!entityType.length) return {};

        if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false') {
            this._clearM2MRecords(recipientsListGr.getValue('sys_id'), isCSMActive);
            this._processScriptedRecipients(recipientsListGr.getUniqueValue(), entityType[0], recListObj[entityType], true);
        }
        this._updateRecord(recipientsListGr);
        return recListObj[entityType[0]];
    },

    buildRecipientsListForPublication: function(publicationSysId, totalCount) {
        var publicationGr = new GlideRecord('sn_publications_publication');
        if (!publicationGr.get(publicationSysId)) {
            gs.error("RecipientsListApi::buildRecipientsListForPublication: Invalid publication id:" + publicationSysId);
            return;
        }
        var recipientsList = publicationGr.getValue("recipient_lists");
        var isCSMActive = GlidePluginManager.isActive('com.sn_customerservice');
        if (!recipientsList)
            return;
        //Clear recipient list
        var recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
        recipientsGr.addQuery('publication', publicationSysId);
        recipientsGr.deleteMultiple();

        //insert or update email notification
        var emailNotification = false;
        var emailRecipients = [];
        if (publicationGr.getValue('skip_notifications') == 0)
            emailNotification = true;
        recipientsList = recipientsList.split(",");
        for (var i = 0; i < recipientsList.length; ++i) {
            var recipientListGr = new GlideRecord("sn_publications_recipients_list");
            if (recipientListGr.get(recipientsList[i])) {
                var index = 0;
                var refreshRate = 2000;
                var percentage = 0;
                if (!totalCount)
                    totalCount = refreshRate;

                if (recipientListGr.getValue('type') == 'consumers') {
                    var consumerList = [];
                    this._mergeArraySet(consumerList, this.buildRecipientsList(recipientsList[i]));
                    for (var j = 0; j < consumerList.length; ++j) {
                        recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
                        recipientsGr.addQuery('publication', publicationSysId);
                        recipientsGr.addQuery('consumer', consumerList[j]);
                        recipientsGr.query();
                        if (!recipientsGr.hasNext()) {
                            recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
                            recipientsGr.setValue('publication', publicationSysId);
                            recipientsGr.setValue('consumer', consumerList[j]);
                            recipientsGr.setValue('type', 'consumers');
                            //insert sys_user if consumer has login id
                            var consumerGr = new GlideRecord("csm_consumer");
                            if (consumerGr.get(consumerList[j])) {
                                var consumer_user_id = consumerGr.getValue('user');
                                if (consumer_user_id) {
                                    recipientsGr.setValue('user', consumer_user_id);
                                }
                                /*if(emailNotification){
                                	var consumer_email = consumerGr.getValue('email');
                                	if(emailRecipients.indexOf(consumer_email)==-1){
                                		emailRecipients.push(consumer_email);
                                	}
                                }*/
                            }
                            index++;
                            if (index > refreshRate) {
                                percentage = Number(publicationGr.getValue('percentage'));
                                publicationGr.setValue('percentage', percentage + (100 * refreshRate / Number(totalCount)));
                                publicationGr.update();
                                index = 0;
                            }
                            recipientsGr.insert();
                        }

                    }
                } else {
                    var userList = [];
                    this._mergeArraySet(userList, this.buildRecipientsList(recipientsList[i]));
                    for (var k = 0; k < userList.length; ++k) {
                        var userGr = new GlideRecord("sys_user");
                        if (userGr.get(userList[k])) {
                            recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
                            recipientsGr.addQuery('publication', publicationSysId);
                            recipientsGr.addQuery('user', userList[k]);
                            recipientsGr.query();
                            if (!recipientsGr.hasNext()) {
                                recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
                                recipientsGr.setValue('publication', publicationSysId);
                                recipientsGr.setValue('user', userList[k]);
                                if (userGr.getValue('sys_class_name') == 'customer_contact')
                                    recipientsGr.setValue('type', 'external');
                                else if (userGr.getValue('sys_class_name') == 'sys_user')
                                    recipientsGr.setValue('type', 'internal');
                                else
                                    recipientsGr.setValue('type', '');

                                /*if(emailNotification){
                                	if(emailRecipients.indexOf(userList[k])==-1){
                                		emailRecipients.push(userList[k]);
                                	}
                                }*/
                                index++;
                                if (index > refreshRate) {
                                    percentage = Number(publicationGr.getValue('percentage'));
                                    publicationGr.setValue('percentage', percentage + (100 * refreshRate / Number(totalCount)));
                                    publicationGr.update();
                                    index = 0;
                                }
                                recipientsGr.insert();
                            }

                        }

                    }
                }
            }
        }

        //insert or update email notification
        if (emailNotification == true) {
            var template = publicationGr.getValue('target_email_template');
            //var recipient_users = emailRecipients.toString();
            var notificationId = publicationGr.getValue('notification');

            //insert
            if (!notificationId) {
                var name = publicationGr.getValue('number') + " notification";
                var collection = "sn_publications_publication";
                var generation_type = "engine";
                var action_update = true;
                var condition = "sys_id=" + publicationSysId + "^stageCHANGESTOpublished^skip_notifications=false^target_email_templateISNOTEMPTY^EQ";
                if (isCSMActive) {
                    notificationId = new global.PublicationUtils().createEmailNotification(name, collection, generation_type, action_update, condition, template); //,recipient_users);
                    publicationGr.setValue('notification', notificationId);
                }
            } //else update
            else if (isCSMActive) {
                new global.PublicationUtils().updateEmailNotification(notificationId, template); //,recipient_users);
            }
        }
        this._updateRecord(publicationGr);
    },

    buildRecipientsList: function(recipientsListSysId, skipInsert, recipientsListGr, args) {
        var targetSet = {};
        var targetList = [];
        var isCSMActive = GlidePluginManager.isActive('com.sn_customerservice');
        if (!recipientsListGr) {
            recipientsListGr = new GlideRecord('sn_publications_recipients_list');
            if (!recipientsListGr.get(recipientsListSysId)) {
                gs.error('RecipientsListApi::buildRecipientsList - Invalid recipients_list sysId:' + recipientsListSysId);
                return;
            }
        }
        var recipientListMethod = recipientsListGr.getValue('method');

        if (recipientsListGr.enable_script)
            return this.buildRecipientsListForScript(recipientsListGr, skipInsert, args);

        var dynamicConditionsNeeded = recipientsListGr.getValue("specify_dynamic_conditions") != 0;
        var recipientListMeta = this._getRecipientListMetaData(recipientsListSysId);
        var isListInternal = recipientsListGr.getValue('type') == 'internal';
        var isListExternal = recipientsListGr.getValue('type') == 'external';
        var isListConsumer = recipientsListGr.getValue('type') == 'consumers';
        var targetTable = recipientsListGr.getValue('table');
		var manuallyAddedRecords = this._getManualM2MRecords(recipientsListSysId, recipientListMeta);
        var targetField;
        var index = 0;
        var total_count = 0;
        var percentage = 0;
        var refreshRate = 2000;
        var additionalUsers;
		
		if (recipientListMethod == "upload") {
            this._updateRecord(recipientsListGr);
            return manuallyAddedRecords;
        }

        //get users from additional recipient static list
        var staticList;
        if (isListInternal) {
            staticList = recipientsListGr.getValue('additional_recipients');
            targetField = recipientsListGr.getValue('user_field');
        } else if (isListExternal) {
            staticList = recipientsListGr.getValue('additional_recipients_external');
            targetField = recipientsListGr.getValue('user_field');
        } else if (isListConsumer) {
            staticList = recipientsListGr.getValue('additional_recipients_consumer');
            targetField = recipientsListGr.getValue('user_field');
        } else
            targetField = recipientsListGr.getValue('account_field');


        if (staticList) {
            additionalUsers = staticList.split(',');
            total_count = additionalUsers.length;
        }

        if (dynamicConditionsNeeded || recipientListMethod == 'dynamic') {

            var dynamicConditionQuery = recipientsListGr.getValue('conditions') == null ? "" : recipientsListGr.getValue('conditions');

            var targetListGr = new GlideRecord(targetTable);
            targetListGr.addEncodedQuery(dynamicConditionQuery);
            targetListGr.query();
            if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false')
                total_count += targetListGr.getRowCount();

            while (targetListGr.next()) {
                this._checkRecipientExists(recipientListMeta['reftable'], targetListGr, targetField, targetSet, recipientListMeta['classCheck']);
               if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false') {
                    index++;
                    if (index > refreshRate) {
                        percentage = Number(recipientsListGr.getValue('percentage'));
                        recipientsListGr.setValue('percentage', percentage + (50 * refreshRate / total_count));
                        recipientsListGr.update();
                        index = 0;
                    }
                }
            }
        }

        if (staticList) {
            for (var j = 0; j < additionalUsers.length; ++j) {
                targetSet[additionalUsers[j]] = true;
                if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false') {
                    index++;
                    if (index > refreshRate) {
                        percentage = Number(recipientsListGr.getValue('percentage'));
                        recipientsListGr.setValue('percentage', (percentage + 50 * refreshRate / total_count));
                        recipientsListGr.update();
                        index = 0;
                    }
                }
            }
        }

        //Clear Recipint M2M list
        if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false')
            this._clearM2MRecords(recipientsListSysId, isCSMActive);


        //Build target recipient list
        for (var uSysId in targetSet) {
            if (targetSet.hasOwnProperty(uSysId)) {
               if (gs.nil(skipInsert) || !skipInsert || skipInsert == 'false') {
				   if(manuallyAddedRecords.indexOf(uSysId) == -1)
                    this._insertM2MRecord(recipientsListSysId, recipientListMeta, uSysId, true, false);
                   if (dynamicConditionsNeeded || recipientListMethod == 'dynamic') {
                       index++;
                       if (index > refreshRate) {
                          percentage = Number(recipientsListGr.getValue('percentage'));
                          recipientsListGr.setValue('percentage', (percentage + 50 * refreshRate / total_count));
                          recipientsListGr.update();
                          index = 0;
                       }
                   }
                }
                if(skipInsert === true || skipInsert === 'true' || this._checkActiveCommunication(recipientsListSysId,recipientListMeta,uSysId) == '1')
					targetList.push(uSysId);
            }
        }
		this._mergeArraySet(targetList, manuallyAddedRecords);
        this._updateRecord(recipientsListGr);
        return targetList;
    },
	
    _checkActiveCommunication: function(recListSysId, entityParams,uSysId){
		 var recipientsGr = new GlideRecord(entityParams["table"]);

        recipientsGr.addQuery('recipients_list', recListSysId);
        recipientsGr.addQuery(entityParams["field"], uSysId);
        recipientsGr.query();
		recipientsGr.next();
		var result =  recipientsGr.getValue('active_communication')+'';
		return result;
		
	},

    getRecipientsListCount: function(recipientsLists) {
        var totalCount = 0;
        var recipientsList = recipientsLists;
        recipientsList = recipientsList.split(",");
        for (var i = 0; i < recipientsList.length; ++i) {
            var recipientsListGr = new GlideRecord('sn_publications_recipients_list');
            if (recipientsListGr.get(recipientsList[i])) {
                var dynamicConditionsNeeded = recipientsListGr.getValue("specify_dynamic_conditions") != 0;
                var recipientListMethod = recipientsListGr.getValue('method');

                var isListInternal = recipientsListGr.getValue('type') == 'internal';
                var isListExternal = recipientsListGr.getValue('type') == 'external';
                var isListConsumer = recipientsListGr.getValue('type') == 'consumers';

                //get users count from additional recipient static list
                var staticList;
                if (isListInternal) {
                    staticList = recipientsListGr.getValue('additional_recipients');
                } else if (isListExternal) {
                    staticList = recipientsListGr.getValue('additional_recipients_external');
                } else if (isListConsumer) {
                    staticList = recipientsListGr.getValue('additional_recipients_consumer');
                }
                if (staticList)
                    totalCount += staticList.split(',').length;

                //get users count from conditions only if the recipient list condition is dynamic
                if (recipientListMethod == 'dynamic') {
					if (recipientsListGr.enable_script) {
						var recListObj = this._evaluateRecipientListScript(recipientsListGr);
						var entityType = Object.keys(recListObj);
						if (entityType.length > 0) {
							var entities = recListObj[entityType[0]];
							if (entities.length > 0) {           
								totalCount += entities.length;
							}
						}
					} else {
						var targetTable = recipientsListGr.getValue('table');
						var targetField;
						if (isListInternal || isListExternal || isListConsumer)
							targetField = recipientsListGr.getValue('user_field');
						else
							targetField = recipientsListGr.getValue('account_field');
						var dynamicConditionQuery = recipientsListGr.getValue('conditions') == null ? "" : recipientsListGr.getValue('conditions');

						var targetListGr = new GlideRecord(targetTable);
						targetListGr.addEncodedQuery(dynamicConditionQuery);
						targetListGr.query();
						totalCount += targetListGr.getRowCount();
					}
                }
            }
        }
        return totalCount;
    },

    refreshRecepients: function() {
        var activePublications = this._getActivePublications();
        var totalPublications = activePublications.length;
        var toAddr = this._getToAddress();
        for (var i = 0; i < totalPublications; i++) {
            this._getNewRecepients(activePublications[i], toAddr);
        }
		gs.info("Recipients List refresh information - "+JSON.stringify(this.processedRecipients));
    },

    _getToAddress: function() {
        var smtp_address = '';
        var gr = new GlideRecord('sys_email_account');
        gr.addActiveQuery();
        gr.addQuery('type', 'smtp');
        gr.query();
        if (gr.next())
            smtp_address = gr.getValue('from') ? gr.getValue('from') : gr.getValue('user_name');
        return smtp_address;
    },

    _getActivePublications: function() {
        var listofActivePublications = [];
        var dateNow = new GlideDateTime(); // Get hours and seconds too
        var publicationsGR = new GlideRecord("sn_publications_publication");
        publicationsGR.addQuery('stage', 'published');
        publicationsGR.addQuery('state', '2');
        publicationsGR.addQuery('expiry_date', '>', dateNow);
        publicationsGR.addQuery('publish_date', '<', dateNow);
        publicationsGR.query();
        while (publicationsGR.next()) {
            var pubGr = '';
            pubGr = new GlideRecord("sn_publications_publication");
            pubGr.get(publicationsGR.sys_id);
            listofActivePublications.push(pubGr);
        }
        return listofActivePublications;
    },

    _getNewRecepients: function(publicationGR, toAddr) {
        var publicationSysId = publicationGR.sys_id;
        var existingRecipients = [];
        var existingRecipientsConsumers = [];
        var newRecipients = [];
        var emailNotification = false;
        var userType = '';
        //var refreshRecepientListStatus = {};

        var recipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
        recipientsGr.addQuery('publication', publicationSysId);
        recipientsGr.query();
        while (recipientsGr.next()) {
            if (recipientsGr.getValue('type') == 'consumers')
                existingRecipientsConsumers.push(recipientsGr.getValue('consumer'));
            else
                existingRecipients.push(recipientsGr.getValue('user'));
        }
        existingRecipients = existingRecipients.join();
        existingRecipientsConsumers = existingRecipientsConsumers.join();



        //Split GlideList and query for the recepientList
        var recepientList = publicationGR.recipient_lists.split(',');
        for (var j = 0; j < recepientList.length; j++) {
            var recepientListGR = new GlideRecord('sn_publications_recipients_list');
			//Below block of code added for performance optimization, recipient list would be refreshed only 
			//once, not as part of all publications
            if (recepientListGR.get(recepientList[j])) {
				if (gs.nil(this.processedRecipients[recepientList[j]])) {
                        var recListInfo = {};
                        recListInfo.refreshed = true;
                        recListInfo.refreshAvoided = 0;
                        recListInfo.publicationID = String(publicationSysId);
                        var beforeTime = new GlideDateTime().getNumericValue();
                        this.refreshRecepientList(recepientListGR);
                        var refreshTimeTaken = (new GlideDateTime()).getNumericValue() - beforeTime;
                        recListInfo.refreshTimeTaken = refreshTimeTaken+'ms';
                        this.processedRecipients[recepientList[j]] = recListInfo;
                    } else {
                        this.processedRecipients[recepientList[j]].refreshAvoided++;
                    }
				userType = recepientListGR.getValue('type');

                var type = '';
                var user_id;
                if (userType == 'consumers') {
                    var publicationsRecipientsConsumerListGR = new GlideRecord("sn_publications_recipientslist_consumer_m2m");
                    publicationsRecipientsConsumerListGR.addQuery('recipients_list', '=', recepientList[j]);
                    publicationsRecipientsConsumerListGR.addQuery('consumer', 'NOT IN', existingRecipientsConsumers);
                    publicationsRecipientsConsumerListGR.addQuery('active_communication','true');
                    publicationsRecipientsConsumerListGR.query();
                    while (publicationsRecipientsConsumerListGR.next()) {
                        user_id = publicationsRecipientsConsumerListGR.getValue('consumer');
                        var consumerGr = new GlideRecord("csm_consumer");
                        if (consumerGr.get(user_id)) {
                            var consumer_user_id = consumerGr.getValue('user');
                            type = 'consumers';
                            newRecipients.push(user_id);
                            existingRecipientsConsumers = existingRecipientsConsumers + ',' + user_id;
                            if (consumer_user_id) {
                                this._addUsersToPublication(publicationSysId, user_id, type, consumer_user_id);
                            } else
                                this._addUsersToPublication(publicationSysId, user_id, type);
                        }
                    }
                } else {
                    var publicationsRecipientsListGR = new GlideRecord("sn_publications_recipientslist_user_m2m");
                    publicationsRecipientsListGR.addQuery('recipients_list', '=', recepientList[j]);
                    publicationsRecipientsListGR.addQuery('user', 'NOT IN', existingRecipients);
                    publicationsRecipientsListGR.addQuery('active_communication','true');
                    publicationsRecipientsListGR.query();
                    while (publicationsRecipientsListGR.next()) {
                        user_id = publicationsRecipientsListGR.getValue('user');
                        var userGr = new GlideRecord("sys_user");
                        if (userGr.get(user_id)) {
                            if (userGr.getValue('sys_class_name') == 'customer_contact')
                                type = 'external';
                            else if (userGr.getValue('sys_class_name') == 'sys_user')
                                type = 'internal';
                            newRecipients.push(user_id);
                            existingRecipients = existingRecipients + ',' + user_id;
                            this._addUsersToPublication(publicationSysId, user_id, type);
                        }
                    }
                }
            }
        }

        newRecipients = newRecipients.join();

        // Add newRecipients to Email
        // 		if(toAddr == '')
        // 			toAddr = 'abel.tuter@example.com';
        if (publicationGR.getValue('skip_notifications') == 0)
            emailNotification = true;
        if (newRecipients != '' && toAddr != '' && emailNotification)
            gs.eventQueue("sn_publications.addBcc", publicationGR, toAddr, newRecipients);

    },

    _addUsersToPublication: function(publication, user, type, consumer_user_id) {
        var newrecipientsGr = new GlideRecord("sn_publications_publication_contact_m2m");
        newrecipientsGr.setValue('publication', publication);
        newrecipientsGr.setValue('type', type);
        if (type == 'consumers')
            newrecipientsGr.setValue('consumer', user);
        else
            newrecipientsGr.setValue('user', user);
        if (consumer_user_id != undefined)
            newrecipientsGr.setValue('user', consumer_user_id);
        newrecipientsGr.update();
    },

    refreshRecepientList: function(recepientListGR, skipInsert, args, executeSync) {
        var scheduleJob = false;
        var totalCount = 0;
        var minCount = 2000;
        var type = recepientListGR.type;
        var staticList;

        if (recepientListGR.state == 1) {
            gs.addErrorMessage(gs.getMessage("You are currently refreshing the list"));
            return;
        }

		recepientListGR.state = 1;
		if (recepientListGR.enable_script)
			recepientListGR.state = 0;
        recepientListGR.percentage = 0;
        recepientListGR.update();

        //Check if enable script is true
        if (recepientListGR && recepientListGR.enable_script) {
			var recListObj = this._evaluateRecipientListScript(recepientListGR, args);
            var entityType = Object.keys(recListObj);
            if (!entityType.length) return;
            if (recListObj[entityType[0]].length > minCount && !args) {
                gs.eventQueue("sn_publications.build_recipient_list", recepientListGR, skipInsert ? true : false);
                return;
            } else
                return this.buildRecipientsListForScript(recepientListGR, skipInsert, args);
        }
		
		//If executeSync is true then execute synchronously without adding an event to the queue.
		if(executeSync)
			return this.buildRecipientsList(recepientListGR.getUniqueValue(), skipInsert, recepientListGR);

        totalCount = this.getRecipientsListCount(recepientListGR.getValue('sys_id'));

        if (totalCount > minCount)
            scheduleJob = true;

        if (scheduleJob && !skipInsert)
            gs.eventQueue("sn_publications.build_recipient_list", recepientListGR, skipInsert ? true : false);
        else
            return this.buildRecipientsList(recepientListGR.getUniqueValue(), skipInsert, recepientListGR);
    },
	
    deleteRecipientList: function(recipientsListSysId){
        //Delete the M2M records.
        var recipientsGr = new GlideRecord("sn_publications_recipientslist_account_m2m");
        recipientsGr.addQuery('recipients_list', recipientsListSysId);
        recipientsGr.deleteMultiple();

        //Delete the recipientsList.
        var recipientsListGr = new GlideRecord('sn_publications_recipients_list');
        recipientsListGr.get(recipientsListSysId);
        recipientsListGr.deleteRecord();
    },

    type: 'RecipientsListApi'
};
```