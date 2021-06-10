---
title: "ML_UI_DAO"
id: "ml_ui_dao"
---

API Name: sn_ml_ui.ML_UI_DAO

```js
var ML_UI_DAO = Class.create();
ML_UI_DAO.prototype = {
    initialize: function() {
        this.logger = global.MLBaseLogger.getLogger("ML_UI_Dao");
        this.top_n = gs.getMessage('ML Solution Top N');
		this.confidence_level = gs.getMessage('Confidence Level');
		this.useNewSchema = gs.getProperty('glide.platform_ml.use_new_schema',false);
    },
    
    getClusteringData : function(solution_id, params) {
        this.logger.debug("inside ML_UI_DAO:getClusteringData params = "+JSON.stringify(params));
        var output = {};
        output.totalRecords = 0;
        output.cluster_data = [];
        output.cluster_meta_data = {};
        /*cluster_Data = [
            {
                'name': 'clusterid 1',
                'data': [
                          {
                            "rec": "Incident: INC0015332",
                            "rec_sys_id": "ba14f2fadb401300864adfea5e9619ab",
                             "cluster_id_val": "2",
                             "cluster_id": "af467894b7903300d1dcf8b8ee11a910",
                             "x": 10,
                             "y": 20
                          }, 
                          {....}, 
                          {.....}
                        ]
            },
            { ... }]
        */
        if (!solution_id) {
            this.logger.error("sys_id is not present");
            return output;
        }

        //Get top 50 cluster depending on cluster quality
        var maxClusterSize = '';
        var minClusterSize = '';
        var clusterIdArray = [];
        var clusterSysIdArray = [];
        var clusterMetaHashMap = {};

        //ClusterHashMap is used to Gather all records for the particular Cluster id
        var clusterHashMap = {};

        var c_summary_gr = new GlideRecordSecure(global.MLBaseConstants.CLUSTER_SUMMARY);
        c_summary_gr.addQuery(global.MLBaseConstants.COL_SOLUTION,solution_id);
        c_summary_gr.orderByDesc(global.MLBaseConstants.COL_CLUSTER_QUALITY);
        c_summary_gr.setLimit(50);
        c_summary_gr.query();
        while (c_summary_gr.next()) {
            var cluster_id = c_summary_gr.getValue(global.MLBaseConstants.COL_CLUSTER_ID);
            var cluster_size = parseInt(c_summary_gr.getValue(global.MLBaseConstants.COl_CLUSTER_SIZE));
            var cluster_quality = parseFloat(c_summary_gr.getValue(global.MLBaseConstants.COL_CLUSTER_QUALITY));
            var cluster_sys_id = c_summary_gr.getUniqueValue();
            clusterIdArray.push(cluster_id);
            clusterSysIdArray.push(c_summary_gr.getUniqueValue());
            if(!(isNaN(cluster_size) || isNaN(cluster_quality))) {
                clusterMetaHashMap[cluster_sys_id] = {
                    'id': cluster_id,
                    'size': cluster_size,
                    'quality' : cluster_quality,
                    'solution' : c_summary_gr.getDisplayValue(global.MLBaseConstants.COL_SOLUTION)
                };
            
                if (!maxClusterSize || maxClusterSize < parseInt(cluster_size)) {
                    maxClusterSize = parseInt(cluster_size);
                } 
            
                if (!minClusterSize || (minClusterSize > cluster_size)) {
                    minClusterSize = parseInt(cluster_size);
                }
            }
        }
    
        //Getting Cluster details record
        var table = global.MLBaseConstants.CLUSTER_DETAILS;
        var cluster_id_col = global.MLBaseConstants.COL_CLUSTER_ID;
        var filter = params.filter ? params.filter : "";
        var gr = new GlideRecordSecure(table);
        if (filter) {
            gr.encodedQuery(filter);
        }
        gr.addQuery(cluster_id_col,'IN',clusterSysIdArray.toString());
        gr.addQuery(global.MLBaseConstants.COL_SOLUTION,solution_id);
        gr.addNotNullQuery("graph_x_value");
        gr.addNotNullQuery("graph_y_value");
        gr.query();
        output.totalRecords = gr.getRowCount();
        while (gr.next()){
            var mlClusterObj = this.prepareClusterDataObj(gr);
            if (!gs.nil(mlClusterObj)){
                if ( clusterHashMap.hasOwnProperty(mlClusterObj.cluster_id) ) {
                    clusterHashMap[mlClusterObj.cluster_id].push(mlClusterObj);
                } else {
                    clusterHashMap[mlClusterObj.cluster_id] = [mlClusterObj];
                }
            }
        }

        output.cluster_meta_data.data = clusterMetaHashMap;
        output.cluster_meta_data.max_cluster_size = maxClusterSize;
        output.cluster_meta_data.min_cluster_size = minClusterSize;
        //transforming Clusterdata for highcharts scatterplot.
        //clusterIdArray has cluster ordered depending on the cluster Quality
        //for (var key in clusterHashMap) {
        for (var i=0; i<clusterSysIdArray.length; i++){ 
            if (!gs.nil(clusterHashMap[clusterSysIdArray[i]])){
                var seriesObj = {
                    'name' : clusterMetaHashMap[clusterSysIdArray[i]].id,
                    'data' : clusterHashMap[clusterSysIdArray[i]],
					'sysId' : clusterSysIdArray[i]
                };
                output.cluster_data.push(seriesObj);
            }
        }
        return output;  
    },
    
    prepareClusterDataObj : function(gr){
        var cluster_obj = {};
        var x_val = gr.getValue(global.MLBaseConstants.COl_CLUSTER_X_VAL);
        var y_val = gr.getValue(global.MLBaseConstants.COl_CLUSTER_Y_VAL);
        if (!(gs.nil(x_val) || gs.nil(y_val) || isNaN(parseFloat(x_val)) || isNaN(parseFloat(y_val)))) {
            cluster_obj.rec = gr.getDisplayValue(global.MLBaseConstants.COl_CLUSTER_REC_SYS_ID);
            cluster_obj.rec_sys_id = gr.getValue(global.MLBaseConstants.COl_CLUSTER_REC_SYS_ID);
            cluster_obj.cluster_id_val = gr.getDisplayValue(global.MLBaseConstants.COL_CLUSTER_ID);
            cluster_obj.cluster_id = gr.getValue(global.MLBaseConstants.COL_CLUSTER_ID);
            cluster_obj.x = parseFloat(x_val);
            cluster_obj.y = parseFloat(y_val);
            return cluster_obj;
        }
        return null;
    },
    
    getSolutionData: function(solution_id, params){
        this.logger.debug("inside ML_UI_DAO:getSolutionData params = "+JSON.stringify(params));
        var output = {};
        output.capability = "";
        output.field_list = "";
		output.table = "";
		output.table_name = "";
        if (!solution_id) {
            this.logger.error("sys_id is not present");
            return output;
        }

        if (this.useNewSchema == "true"){
            var solution_gr = this.getGlideRecord(global.MLBaseConstants.ML_SOLUTION, solution_id);
            if (gs.nil(solution_gr)){
                this.logger.error("Solution GR is not present");
                return output;
            }
            output.capability = solution_gr.getValue('capability');
        } else {
            var solution_gr = this.getGlideRecord(global.MLBaseConstants.ML_SOLUTION, solution_id);
            if (gs.nil(solution_gr)){
                this.logger.error("Solution GR is not present");
                return output;
            }
            var soln_def_gr = this.getGlideRecord(global.MLBaseConstants.ML_SOLUTION_DEF,solution_gr.getValue('solution_definition'));
            if (gs.nil(soln_def_gr)){
                this.logger.error("Solution Definition GR is not present");
                return output;
            }
               
            var template_gr = this.getGlideRecord(global.MLBaseConstants.ML_TRAINER_DEF,soln_def_gr.getValue('trainer'));
            if (gs.nil(template_gr)){
                this.logger.error("Solution Template GR is not present");
                return output;
            }
            output.capability = template_gr.getValue('name');
        }       
        switch(output.capability) {
            case 'classification_trainer':
                output.field_list = solution_gr.getDisplayValue('input_fields');
                output.table = solution_gr.getValue('table');
                output.op_table = solution_gr.getValue('table');
                break;
            case 'similarity_trainer':
                output.field_list = solution_gr.getDisplayValue('fields_to_compare');
                output.table = solution_gr.getValue('table_to_compare');
                output.op_table = solution_gr.getValue('table');
                break;
            case 'clustering_trainer':
                output.field_list = solution_gr.getDisplayValue('prediction_input_fields');
                output.table = solution_gr.getValue('table');
                output.op_table = solution_gr.getValue('table');
                break;
			case 'regression_trainer':
                output.field_list = solution_gr.getDisplayValue('input_fields');
                output.table = solution_gr.getValue('table');
                output.op_table = solution_gr.getValue('table');
                break;	
            default:
        }
        var gr = new GlideRecord('sys_db_object');
        gr.addQuery('name',output.op_table);
        gr.query();
        if (gr.next()) {
            output.table_name = gr.getValue('label');
        }
        if (output.field_list) {
            //code to get column display name and column name
            var fields = output.field_list.split(',');
            output.ui_field_list = [];
			var field_list_obj = {};
            var gr = new GlideRecord(output.table);
            for (var i=0; i<fields.length ; i++){
				var display_name = gr.getElement(fields[i]).getLabel();
                var ui_field_list_obj = {
                    'display_name': display_name,
                    'name':fields[i],
                    'value': ''
                };
				//Adding column name in addition to display name for columns having same display_name
				if(!field_list_obj[display_name]) {
					field_list_obj[display_name] = [ui_field_list_obj];
				} else {
					var field_list_arr = field_list_obj[display_name];
					field_list_arr.push(ui_field_list_obj);
					for (var i=0 ; i< field_list_arr.length; i++) {
						var arr_elem = field_list_arr[i]; 
						arr_elem.display_name = arr_elem.display_name + " ("+ arr_elem.name + ")";
					}
				}
                output.ui_field_list.push(ui_field_list_obj);
            }
            
			if(output.capability === 'regression_trainer'){
				output.ui_field_list.push({'display_name':this.confidence_level,'name':'confidence_level','value':''});
				output.field_list += ',confidence_level';
			} else{
				output.ui_field_list.push({'display_name':this.top_n,'name':'top_n','value':''});
				output.field_list += ',top_n';
			}
        }
        return output;
    },
    
    getGlideRecord: function(table, sys_id) {
        var gr = '';
        if (table && sys_id) {
            gr = new GlideRecordSecure(table);
            gr.get(sys_id);
        }
        return gr;
    },
	
	getClusterTreeMapData: function(solution_id, params){
		this.logger.debug("inside ML_UI_DAO:getClusterTreeMapData params = "+JSON.stringify(params));
        var output = {};
        output.totalRecords = 0;
        output.cluster_treemap_data = [];
        output.cluster_treemap_meta_data = {};
		var maxClusterSize = -1;
		var minClusterSize = -1;
		var minClusterQuality = -1;
		var maxClusterQuality = -1;
		var groupByValues = [];
		output.result = "success";
		output.msg = "";
		var solution_has_groupby = false;
		var solution_groupby_column = "Groupby-value";
		var groupby_val_hashMap = {};
		var colors = ['#278ECF','#71E279','#FCC742','#FFB47D','#A0A8F1','#FF402C','#83BFFF','#6EDB8F','#FFE366','#FFC266','#D284BD','#8784DB','#FF7B65','#CAEEFC','#9ADBAD','#FFF1B2','#FFF9B2','#FFBEB2','#B1AFDB','#FA8DA2','#68D9E1'];
		/*cluster_treemap_data = [
            {
                'data': [
                          {
                           'id':groupby_value / cluster_id,
						   'name': Concept name/groupby_value,
						   'display_data': [{'label':'quality','value':'75'},{'label':'size',value:'105'}],
						   'value':'105'
                          }, 
                          {....}, 
                          {.....}
                        ]
            },
            { ... }]
        */
		if (!solution_id) {
            this.logger.error("sys_id is not present");
			output.result = "failure";
			output.msg = "Solution id is not present ";
            return output;
        }
		
		var solution_gr = new GlideRecordSecure(global.MLBaseConstants.ML_SOLUTION);
		if (solution_gr.get(solution_id)) {
			solution_has_groupby = parseInt(solution_gr.getValue(global.MLBaseConstants.COL_USE_SEGMENTATION)) ? true : false;
			//logic to get column label instead of column name.
			/*if (solution_has_groupby) {
				var table_gr = new GlideRecord("sys_dictionary");
				table_gr.addQuery('table',solution_gr.getValue("table"));
				table_gr.addQuery('column_name',solution_gr.getValue("segmentation_field"));
				table_gr.query();
				if(table_gr.next()){
					solution_groupby_column = table_gr.getDisplayValue('column_label');
				}
			}*/
		} else {
			output.result = "failure";
			output.msg = "Cannot find the Clustering Solution";
			return output;
		} 
		var groupcount = 0;
		var no_of_colors = colors.length;
		var c_summary_gr = new GlideRecordSecure(global.MLBaseConstants.CLUSTER_SUMMARY);
        c_summary_gr.addQuery(global.MLBaseConstants.COL_SOLUTION,solution_id);
        c_summary_gr.orderByDesc(global.MLBaseConstants.COl_CLUSTER_SIZE);
        c_summary_gr.query();
		output.totalRecords = c_summary_gr.getRowCount();
		while(c_summary_gr.next()) {
			var cluster_size = parseInt(c_summary_gr.getValue(global.MLBaseConstants.COl_CLUSTER_SIZE));
			var cluster_quality = parseInt(c_summary_gr.getValue(global.MLBaseConstants.COL_CLUSTER_QUALITY));
			var concept = c_summary_gr.getValue(global.MLBaseConstants.COL_CLUSTER_CONCEPT);
			var purity = c_summary_gr.getValue(global.MLBaseConstants.COL_PURITY);
			var truncated_concept = concept ? concept.split(" ",5).join(" ") : "";
			var treemap_pt = {
				'id': ''+c_summary_gr.getUniqueValue(),
				'name': truncated_concept,
				'value': cluster_size,
				'display_data': [
					{'label':'Cluster Concept','value':concept},
					{'label':'Quality','value':cluster_quality},
					{'label':'Size','value':cluster_size}
				],
				'cluster_type':'cluster',
				'colorValue' : Math.floor(cluster_quality)
			};
			
			if (!gs.nil(purity)) {
				treemap_pt['display_data'].push({'label':'Purity based on','value':''});
				var purity_values = purity.split(";");
				for (var i=0; i< purity_values.length;i++){
					var purityObjArr = purity_values[i].split("=");
					var purity_label = purityObjArr[0] ? purityObjArr[0] : "";
					var purity_value = isNaN(purityObjArr[1]) ? 0 : Math.round(purityObjArr[1] * 100).toFixed(2) + "%";
					treemap_pt['display_data'].push({'label':purity_label,'value':purity_value});
				}
			}
			if (solution_has_groupby) {
				var groupby_val = c_summary_gr.getValue(global.MLBaseConstants.COl_CLUSTER_GRBY_VAL);
				if ( groupby_val && !(groupby_val in groupby_val_hashMap) ) {
					var treemap_grpby_pt = {
						'id': '' + groupby_val,
						'name': groupby_val,
						'value': 0,
						'cluster_count':0,
						'cluster_type':'groupby',
						'color' : '#BDDCFC'
					};
					groupby_val_hashMap[groupby_val] = treemap_grpby_pt;
					groupcount++;
				}
				groupby_val_hashMap[groupby_val]['value'] += cluster_size;
				groupby_val_hashMap[groupby_val]['cluster_count'] = groupby_val_hashMap[groupby_val]['cluster_count'] + 1;
				treemap_pt['parent'] = "" + groupby_val;
			}
			if (maxClusterSize == -1 || maxClusterSize < cluster_size) {
				maxClusterSize = cluster_size;
            } 
            
            if (minClusterSize == -1 || minClusterSize > cluster_size) {
				minClusterSize = cluster_size;
            }
			if (maxClusterQuality == -1 || maxClusterQuality < cluster_quality) {
				maxClusterQuality = cluster_quality;
            } 
            
            if (minClusterQuality == -1 || minClusterQuality > cluster_quality) {
				minClusterQuality = cluster_quality;
            }
			output.cluster_treemap_data.push(treemap_pt);
		}
		output.cluster_treemap_meta_data.max_cluster_size = maxClusterSize;
		output.cluster_treemap_meta_data.min_cluster_size = minClusterSize;
		output.cluster_treemap_meta_data.max_cluster_quality = maxClusterQuality;
		output.cluster_treemap_meta_data.min_cluster_quality = minClusterQuality;
		
		for(var groupby_pt in groupby_val_hashMap) { 
			var pt =  groupby_val_hashMap[groupby_pt];
			pt['display_data'] = [
				{'label':solution_groupby_column,'value':pt['name']},
				{'label':'Cluster Count','value':pt['cluster_count']},
				{'label':'Records in Groupby','value':pt['value']}
			];
			output.cluster_treemap_data.push(pt);
			groupByValues.push(groupby_pt);
		}
		output.cluster_treemap_meta_data.group_by_values = groupByValues;
		if (!output.totalRecords) {
			output.result = "failure";
			output.msg = "Clustering Solution has no records to display";
		}
		return output;
	},
    type: 'ML_UI_DAO'
};
```