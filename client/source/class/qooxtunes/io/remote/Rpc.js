/*
While debugging CORS issues, at one point, I thought that it was necessary to remove the
nocache parameter from the RPC URLs, so I overrode the qooxdoo Rpc class.  It turns out
that the problems were in the python web service.  But I'm keeping this class in case
we ever want to do anything fancy with the Rpc class later.
 */

qx.Class.define("qooxtunes.io.remote.Rpc",
{
    extend : qx.io.remote.Rpc,

    members :
    {
        createRequest: function()
        {
            var req = new qx.io.remote.Request(this.getUrl(),
                "POST",
                "application/json");

            // don't actually need this
            //req.setProhibitCaching ('no-url-params-on-post');

            return req;
        }
    }
});