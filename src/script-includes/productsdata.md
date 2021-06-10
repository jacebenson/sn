---
title: "ProductsData"
id: "productsdata"
---

API Name: sn_appclient.ProductsData

```js
var ProductsData = Class.create();
ProductsData.prototype = {	
	initialize: function() {
		
	},
	
    getAllProducts: function() {
        if (gs.getProperty("sn_appclient.app.install.offline", "true") == "true") {
            gs.info("getAllProducts returning without calling repo as instance is offline");
            return {
                data: {}
            };
        }

        var allStoreProductsRequest = new ScopedAppRepoRequest("get_products_data");
        allStoreProductsRequest.setParameter("instance_id", gs.getProperty("instance_id")),
            candidateStoreProducts = allStoreProductsRequest.post(),
            allStoreProductsRequestStatusCode = allStoreProductsRequest.getStatusCode(),
            response = {
                data: {}
            };
        if (allStoreProductsRequestStatusCode == 200)
            response.data = new global.JSON().decode(candidateStoreProducts);
        response.statusCode = allStoreProductsRequestStatusCode;
        response.storeURL = this.getStoreBaseURL();
        return response;
    },

    subscribeProduct: function(request) {
        if (gs.getProperty("sn_appclient.app.install.offline", "true") == "true") {
            gs.info("subscribeProduct returning without calling repo as instance is offline");
            return {
                data: {}
            };
        }
        var subscribeProductRequest = new ScopedAppRepoRequest("subscribe_product");
        subscribeProductRequest.setParameter("instance_id", gs.getProperty("instance_id"));
        subscribeProductRequest.setParameter("products", request.getParameter("products"));
        subscribeProductRequest.setBasicAuth(request.getParameter("username"), request.getParameter("password"));
        subscribeProductRequest.setParameter("sysparm_user_consent", true);
        var candidateReponse = subscribeProductRequest.post();
        var subscribeRequestStatusCode = subscribeProductRequest.getStatusCode();
        response = {
            data: {}
        };
        if (subscribeRequestStatusCode == 200)
            response.data = new global.JSON().decode(candidateReponse);
        response.statusCode = subscribeRequestStatusCode;
        response.message = response.data.message;
        response.status = response.data.status;
        return response;
    },

    unsubscribeProduct: function(request) {
        if (gs.getProperty("sn_appclient.app.install.offline", "true") == "true") {
            gs.info("unsubscribeProduct returning without calling repo as instance is offline");
            return {
                data: {}
            };
        }
        var unsubscribeProductRequest = new ScopedAppRepoRequest("unsubscribe_product");
        unsubscribeProductRequest.setParameter("instance_id", gs.getProperty("instance_id"));
        unsubscribeProductRequest.setParameter("products", request.getParameter("products"));
        unsubscribeProductRequest.setBasicAuth(request.getParameter("username"), request.getParameter("password"));
        var candidateReponse = unsubscribeProductRequest.post();
        var unsubscribeRequestStatusCode = unsubscribeProductRequest.getStatusCode();
        response = {
            data: {}
        };
        if (unsubscribeRequestStatusCode == 200)
            response.data = new global.JSON().decode(candidateReponse);
        response.statusCode = unsubscribeRequestStatusCode;
        response.message = response.data.message;
        response.status = response.data.status;
        return response;
    },
    
    getStoreBaseURL: function() {
        return  new ScopedAppRepoRequest().getUploadUrl();
    },

    type: 'ProductsData'
};
```