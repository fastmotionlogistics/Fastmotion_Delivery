export const OTPTemplate = (code: string, name: string) => `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;1,400;1,500;1,600&display=swap"
      rel="stylesheet"
    />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
    <script src="https://kit.fontawesome.com/8070d3b382.js" crossorigin="anonymous"></script>
    <title>Document</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif, sans-serif;
      max-width: 560px;
      margin: 0 auto;
     
      color: #88888;
    "
  >
      <p style="text-align: left; font-size: 17px; font-weight: 500; text-align: center;"> ${name},</p>

      <p style="text-align: left; font-size:25px; line-height: 1.7; font-weight: 600; margin-bottom: 13px; margin-top: 20px; text-align: center;">
        ${code}
      </p>

     




    </section>

  </body>
</html>



`;

export const subscriberTemplate = (email = '', name: string) => {
  return `
<!DOCTYPE html>
<html lang="en">
  <head>
    <meta charset="UTF-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1.0" />
    <link rel="preconnect" href="https://fonts.googleapis.com" />
    <link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
    <link
      href="https://fonts.googleapis.com/css2?family=Roboto:wght@300;400;500;700;900&family=Source+Serif+4:ital,wght@0,300;0,400;0,500;1,400;1,500;1,600&display=swap"
      rel="stylesheet"
    />
    <link href="https://fonts.googleapis.com/css2?family=Noto+Color+Emoji&display=swap" rel="stylesheet" />
    <script src="https://kit.fontawesome.com/8070d3b382.js" crossorigin="anonymous"></script>
    <title>Document</title>
  </head>
  <body
    style="
      font-family: Arial, sans-serif, sans-serif;
      max-width: 560px;
      margin: 0 auto;
      
      color: #88888;
    "
  >
    <!-- <section
      style="
        display: flex;
        flex-direction: column;
        align-items: center;
        border-bottom: 1px solid gainsboro;
        padding: 24px 0px;
      "
    >
      <img
        src="https://ci3.googleusercontent.com/proxy/8JhbbiW7TajbHfqNiUDluxGGkKHVEEOXYZVngs7bYU5AzGDmq8G0BmmjmnNsCnR_qcD_5k8TNu4chHLD2OQEE0VWeeVYRmwZ-LzmWuf1VPXMIY2BnLQefYoLgXnj0c174O87XQp6zkek8P3CI4FCOhy5Sn-M9h1GypdhyRBi9kYmuPNCEYytrwh9KsmJDOwVcYkZ-7m1-8fzCYKjA0e0L4iZiMEZcoRK5o8=s0-d-e1-ft#https://hs-24058961.f.hubspotfree.net/hub/24058961/hubfs/Mima%20Print%20materials%203.png?width=300&upscale=true&name=Mima%20Print%20materials%203.png"
        style="width: 35%"
      />
    </section> -->

    <section style="padding: 30px 30px; background-color: white">
      <!-- <img
        src="https://ci3.googleusercontent.com/proxy/5hYeyAbgjbRRWAb2iglUPKRl71LWhTulWie7KLEiFcOcnx9YWCIRF8ex9aBey80vmSt-bYCqgsYZ-2FYMwRLn0FPPxixVbDzhmh6xSjq-aQuz5wnr48nQNZaDb8iZhwjta3MWNN8TwqJy9vqQpBupa2vU8aOPEAZ7jRC9iUufYC3lZ6hIJHdZuEiMVM=s0-d-e1-ft#https://hs-24058961.f.hubspotfree.net/hub/24058961/hubfs/Mima%20Headet.jpg?width=1120&upscale=true&name=Mima%20Headet.jpg"
        style="width: 100%; height: 100px"
      /> -->
      <p style="text-align: left; font-size: 15px; font-weight: 500">Dear ${name},</p>

      <p style="text-align: left; font-size: 15px; line-height: 1.7; margin-bottom: 13px; margin-top: 20px">
        My name is Doyin Adewola, and I am happy to welcome you on board as you begin your wealth-building journey with
        our fractional real estate investment offers. Our properties are carefully selected to deliver excellent
        returns, and we work tirelessly to ensure your investment is well-protected.
      </p>
      <p style="text-align: left; font-size: 15px; line-height: 1.7; margin-bottom: 13px; margin-top: 20px">
        Now, you can co-own high-value property and start earning from it. Our team is committed to delivering regular
        updates on the performance of your investment so you can stay informed every step of the way. Trust is paramount
        when investing, and we take that responsibility very seriously.
      </p>
      <p style="text-align: left; font-size: 15px; line-height: 1.7; margin-bottom: 13px; margin-top: 20px">
        Our Mobile App will be ready in 60 days, and it will give you access to buy fractions, sell fractions, and
        manage your asset portfolio, all from the comfort of your phone. In the meantime, you can buy fractions of our
        available property through this <a href="https://paystack.com/pay/fractional">link</a>
      </p>

      <p style="text-align: left; font-size: 15px; line-height: 1.7; margin-bottom: 13px; margin-top: 20px">
        We are honored to have you as a community member and look forward to helping you achieve your financial goals.
        Thank you for choosing user_api for your investment needs.
      </p>

      <div style="margin-top: 30px">
        <div style="display: flex; align-items: center">
          <p style="text-align: left; font-size: 15px; line-height: 1.7; margin: 10px 0">Best Regards</p>
        </div>
      </div>

      <div style="">
        <p style="text-align: left; font-size: 14px; font-weight: 300; line-height: 1.7; margin-bottom: 8px">
          CEO/Founder, user_api
        </p>
        <p
          style="
            text-align: left;
            font-size: 17px;
            font-weight: 700;
            line-height: 1.7;
            margin-bottom: 10px;
            margin-top: 0;
          "
        >
          Doyin Adewola
        </p>
      </div>
    </section>

  
  </body>
</html>


`;
};
