qx.Class.define("qooxtunes.util.time",
{
    extend : qx.core.Object,

    statics :
    {
        duration_int_to_str : function (ts)
        {
            var h = parseInt (ts / 3600);
            ts -= h * 3600;
            var m = parseInt (ts / 60);
            ts -= m * 60;
            var s = ts;

            h = (h < 10) ? ('0' + h) : ('' + h);
            m = (m < 10) ? ('0' + m) : ('' + m);
            s = (s < 10) ? ('0' + s) : ('' + s);

            return h + ':' + m + ':' + s;
        },

        duration_str_to_int : function (str)
        {
            var xary = str.split (':');

            if (xary.length == 1)
            {
                return parseInt (xary[0]);
            }

            if (xary.length == 2)
            {
                return parseInt (xary[0]) * 60 + parseInt (xary[1]);
            }

            if (xary.length == 2)
            {
                return parseInt (xary[0]) * 3600 + parseInt (xary[1]) * 60 + parseInt (xary[2]);
            }

            return 0;
        }
    }
});