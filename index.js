var Q = require('q');
var paperwork = require('paperwork');

// Takes and API call Object and wraps it in an api call
/*

<apiCallObject>
FIELDS - 

'description':  ** OPTIONAL ** '<STRING>' // used for documentation purposes

'validator':  ** OPTIONAL ** '<PAPERWORK_VALIDATOR>' // used for documentation purposes
	* see https://github.com/lperrin/paperwork for documentaiton on how to vaildata
	post request, incuding, arrays, custom validators ect.  Also note that one can also validate parameter contents for restful calls.  to do so simply add a field to the and add validators according to paperworks documentation.  also not that if the validator is falsy there will be not static validation of the data.

'authorizer': ** OPTIONAL ** '<FUNCTION(request, resolver)>'
	* function exposing the request that should be used to authorize if the user has access to the call, if defined requires the either resolver.success() or resolver.error() success grants authorization while error refuses it.  if the authorizer is undefined, no auth is performed.

'handler': ** REQUIRED ** '<FUNCTION(request, resolver)>'
	* function exposing the request that should be used to handle the request accordingly if the request was successfully handled call resolver.success(returnPayload).  If there was an error call resolver.error(errors)
'possibleErrors': ** OPTIONAL ** '<ARRAY of ints>' // used for documentation purposes
*/

/*
	// EXAMPLE

*/

/*
	// HOW IT WORKS


*/

var debug = false;

// exports module
var apiWrapper = module.exports = {
	performAPICall: function(req, res, apiCallObject) {
		// -- IS REQUEST PROCESSABLE
		var request = processRequest(req);
		if (!request) {
			respondInvalid(res);
			return;
		}
		// -- VALIDADATE REQUEST
		vailidateRequest(apiCallObject.validator, request)
		.then(function() {
			// -- CHECK AUTHENTICATION
			return checkAuthentication(apiCallObject.authenticator, request);
		})
		.then(function() {
			// -- HANDLE REQUEST
			return handleRequest(apiCallObject.handler, request);
		})
		.then(function(successObject) {
			// -- RESPOND SUCCESS	
			return respondSuccess(res, successObject);
		})
		.catch(function(errorObject) {
			console.log(errorObject);
			// -- RESPOND WITH ERROR
			res.status(errorObject.status);
			res.json({
				'status': errorObject.status,
				'reason': errorObject.reason,
				'error': true,
				'errors': errorObject.errors
			});
		});
	},
};

// check if request is prcessable
function processRequest(req) {
	// TODO check if request is processable
	return req;
}

// check if reqest and parames meet validator requirements
function vailidateRequest(validator, request) {
	var deffered = Q.defer();

	// add params to reqeust for scenerios where params need to be validated
		/* TODO
		// first make sure the resquest doens't have a _params_ field
		if(!request['_params_'])
		request['_params_'] = params; // params that come from express
	*/

	paperwork(validator.body, request.body, function(errs, validated) {
		if (errs) {
			errs = (errs) ? (errs) : ([]);
			var errors = [];
			errs.forEach(function(item) {
				errors.push({
					'code': 400, // bad request i.e. bad item
					'message': item,
					'field': item.substring(item.lastIndexOf(".") + 1, item.lastIndexOf(":"))
				});
			});
			var errorObject = {
				'status': 400,
				'reason': 'Body did not satisfy requirements',
				'errors': errs
			};
			setTimeout(function() {
				deffered.reject(errorObject);
			});
		} else {
			// the request was invalid
			setTimeout(function() {
				deffered.resolve();
			});
		}
	});
	return deffered.promise;
}

// check authentication
function checkAuthentication(authenticator, request) {
	var deffered = Q.defer();
	var defferedHandler = {
		'success': function() {
			deffered.resolve();
		},
		'error': function() {
			var errorObject = {
				'status': 401,
				'reason': 'caller is not authorized',
				'errors': [{
					'code': 401, // bad request i.e. bad item
					'message': 'Unauthorized'
				}]
			};
			deffered.reject(errorObject);
		}
	};
	if (authenticator) {
		authenticator(request, defferedHandler);
	} else {
		setTimeout(function() {
			deffered.resolve();
		});
	}
	return deffered.promise;
}

// call the handler
function handleRequest(handler, request) {
	var deffered = Q.defer();
	var defferedHandler = {
		'success': function(returnPayload) {
			if (typeof returnPayload != "object") {
				returnPayload = {};
			}
			deffered.resolve(returnPayload);
		},
		'error': function(errors, reason, code, statusCode) {
			if (!errors) {
				errors = {};
			}
			if (typeof errors === 'object') {
				errors = [errors];
			}
			deffered.reject({
				'errors': errors,
				'reason': reason,
				'code': (code) ? (code) : (400),
				'status': (statusCode) ? (statusCode) : (400)
			});
		}
	};
	if (handler) {
		handler(request, defferedHandler);
	} else {
		setTimeout(function() {
			deffered.reject();
		});
	}
	return deffered.promise;
}


// --- SUCCESS -- if the request was successfull
function respondSuccess(res, payload) {
	res.status(200);
	res.json({
		'status': 'success',
		'payload': (payload) ? (payload) : ({})
	});
	return;
}

// --- UNPROCESSABLE -- if json parse false
function respondInvalid(res, reason) {
	res.status(422);
	res.json({
		'status': 'Unprocessable',
		'reason': (reason) ? (reason) : ('The cannot process the enitity'),
		'error': true,
		'errors': [{
			'code': 422, // bad request i.e. bad item
			'message': 'The cannot process the enitity'
		}]
	});
}