type OrderCreatedTemplateData = {
  name: string;
  orderReference: string;
  domainName: string;
  amount: number;
};

const escapeHtml = (value: string) =>
  value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#039;');

export const orderCreatedTemplate = ({
  name,
  orderReference,
  domainName,
  amount,
}: OrderCreatedTemplateData) => {
  const safeName = escapeHtml(name);
  const safeOrder = escapeHtml(orderReference);
  const safeDomain = escapeHtml(domainName);

  return `
    <!doctype html>
    <html>
      <body style="
        margin:0;
        padding:0;
        background:#f7f7f8;
        font-family:Arial,Helvetica,sans-serif;
        color:#18181b;
      ">
        <table
          width="100%"
          cellspacing="0"
          cellpadding="0"
          border="0"
          style="padding:32px 16px;"
        >
          <tr>
            <td align="center">

              <table
                width="100%"
                cellspacing="0"
                cellpadding="0"
                border="0"
                style="
                  max-width:600px;
                  background:#ffffff;
                  border:1px solid #e4e4e7;
                "
              >
                <tr>
                  <td style="padding:28px 28px 18px;">
                    <div style="
                      font-size:20px;
                      font-weight:700;
                      color:#3120ff;
                    ">
                      Runtime
                    </div>
                  </td>
                </tr>

                <tr>
                  <td style="padding:0 28px 28px;">
                    <h1 style="
                      margin:0;
                      font-size:24px;
                      line-height:1.25;
                    ">
                      Your order has been created
                    </h1>

                    <p style="
                      margin:16px 0 0;
                      font-size:14px;
                      line-height:1.7;
                      color:#52525b;
                    ">
                      Hi ${safeName}, your domain order has been received.
                    </p>

                    <table
                      width="100%"
                      cellspacing="0"
                      cellpadding="0"
                      border="0"
                      style="
                        margin-top:24px;
                        border:1px solid #e4e4e7;
                      "
                    >
                      <tr>
                        <td style="padding:12px 14px;color:#71717a;font-size:12px;">
                          Domain
                        </td>

                        <td align="right" style="padding:12px 14px;font-size:13px;font-weight:700;">
                          ${safeDomain}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:12px 14px;border-top:1px solid #f4f4f5;color:#71717a;font-size:12px;">
                          Order
                        </td>

                        <td align="right" style="padding:12px 14px;border-top:1px solid #f4f4f5;font-size:13px;font-weight:700;">
                          ${safeOrder}
                        </td>
                      </tr>

                      <tr>
                        <td style="padding:12px 14px;border-top:1px solid #f4f4f5;color:#71717a;font-size:12px;">
                          Amount
                        </td>

                        <td align="right" style="padding:12px 14px;border-top:1px solid #f4f4f5;font-size:13px;font-weight:700;color:#3120ff;">
                          $${amount.toFixed(2)} USD
                        </td>
                      </tr>
                    </table>

                    <div style="
                      margin-top:24px;
                      padding:16px;
                      background:#3120ff0d;
                      border:1px solid #3120ff26;
                    ">
                      <p style="
                        margin:0;
                        font-size:13px;
                        font-weight:700;
                      ">
                        EcoCash USD
                      </p>

                      <p style="
                        margin:8px 0 0;
                        font-size:13px;
                        line-height:1.7;
                        color:#52525b;
                      ">
                        Send the exact amount to:
                        <br />
                        <strong>0783827570</strong>
                        <br />
                        Ngaavongwe Ndasowampange
                      </p>
                    </div>

                    <p style="
                      margin:20px 0 0;
                      font-size:13px;
                      line-height:1.7;
                      color:#52525b;
                    ">
                      After payment, send your screenshot to Runtime on WhatsApp.
                      Registration will begin after payment is verified.
                    </p>
                  </td>
                </tr>

                <tr>
                  <td style="
                    border-top:1px solid #e4e4e7;
                    padding:18px 28px;
                    font-size:11px;
                    color:#a1a1aa;
                  ">
                    Runtime
                  </td>
                </tr>
              </table>

            </td>
          </tr>
        </table>
      </body>
    </html>
  `;
};