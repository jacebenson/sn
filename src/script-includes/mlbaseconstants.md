---
title: "MLBaseConstants"
id: "mlbaseconstants"
---

API Name: global.MLBaseConstants

```js
var MLBaseConstants = Class.create();
MLBaseConstants.prototype = {
    initialize: function() {
    },

    type: 'MLBaseConstants'
};
MLBaseConstants.CLUSTER_SUMMARY = 'ml_cluster_summary';
MLBaseConstants.CLUSTER_DETAILS = 'ml_cluster_detail';
MLBaseConstants.ML_SOLUTION = "ml_solution";
MLBaseConstants.SOL_DEFINITION_REF_FIELD = "ml_capability_definition";
MLBaseConstants.ML_SOLUTION_DEF = "ml_solution_definition";
MLBaseConstants.ML_CAPABILITY_DEF_BASE = "ml_capability_definition_base";
MLBaseConstants.ML_CAPABILITY_DEF_CLASSIFICATION = "ml_capability_definition_classification";
MLBaseConstants.ML_CAPABILITY_DEF_SIMILARITY = "ml_capability_definition_similarity";
MLBaseConstants.ML_CAPABILITY_DEF_CLUSTERING = "ml_capability_definition_clustering";
MLBaseConstants.ML_CAPABILITY_DEF_REGRESSION = "ml_capability_definition_regression";
MLBaseConstants.ML_ADVANCED_SOL_SETTINGS = "ml_advanced_solution_settings";
MLBaseConstants.ML_TRAINER_DEF = "ml_trainer_definition";
MLBaseConstants.ML_WVC_DETAILS = "ml_word_vector_corpus_details";
MLBaseConstants.COL_WVC = "word_vector_corpus";
MLBaseConstants.COL_SOLUTION = 'solution';
MLBaseConstants.COL_CLUSTER_ID = 'cluster_id';
MLBaseConstants.COL_CLUSTER_QUALITY = 'cluster_quality';
MLBaseConstants.COl_CLUSTER_SIZE = 'cluster_size';
MLBaseConstants.COl_CLUSTER_GRBY_VAL = 'segmentation_val';
MLBaseConstants.COl_CLUSTER_REC_SYS_ID = 'rec_sys_id';
MLBaseConstants.COl_CLUSTER_X_VAL = 'graph_x_value';
MLBaseConstants.COl_CLUSTER_Y_VAL = 'graph_y_value';
MLBaseConstants.ML_MODEL_ARTIFACT = 'ml_model_artifact';
MLBaseConstants.ML_WORD_VECTOR_CORPUS_VERSIONS = 'ml_word_vector_corpus_versions';
MLBaseConstants.ML_WORD_VECTOR_CORPUS = 'ml_word_vector_corpus';
MLBaseConstants.COL_USE_SEGMENTATION = 'use_segmentation';
MLBaseConstants.COL_CLUSTER_CONCEPT = 'cluster_concept';
MLBaseConstants.COL_PURITY = 'purity';

MLBaseConstants.API_RESPONSE_LIMIT_DEFAULT = '10';
MLBaseConstants.API_RESPONSE_LIMIT_MAX = '200';
MLBaseConstants.CLASSIFICATION_TOP_N_MULTIPLIER = '10';

MLBaseConstants.DEFAULT_LOGGER_SOURCE = "MLBaseLogger";
MLBaseConstants.DEFAULT_LOG_LEVEL = 1;

//Paris - Advance solution parameters
MLBaseConstants.LEVENSHTEIN_DISTANCE = "LD";
MLBaseConstants.DBSCAN = "DBSCAN";
```