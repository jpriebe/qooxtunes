qx.Class.define("qooxtunes.util.ui",
{
    extend : qx.core.Object,

    statics :
    {
        build_label : function (value, size, bold)
        {
            var lb;

            lb = new qx.ui.basic.Label (value);

            if (typeof bold === "undefined")
            {
                bold = false;
            }

            var px_size = '16px';
            if (size == 'small')
            {
                px_size = '11px';
            }
            else if (size == 'medium')
            {
                px_size = '14px';
            }


            if (bold)
            {
                lb.setFont (qx.bom.Font.fromString(px_size + " sans-serif bold"));
            }
            else
            {
                lb.setFont (qx.bom.Font.fromString(px_size + " sans-serif"));
            }

            return lb;
        }
    }
});