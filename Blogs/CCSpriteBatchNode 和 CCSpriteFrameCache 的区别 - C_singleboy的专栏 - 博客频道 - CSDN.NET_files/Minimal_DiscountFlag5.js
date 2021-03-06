var CLEAR_GIF = 'data:image/gif;' +
    'base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

var DEFAULT_LOGO = CLEAR_GIF;
var DEFAULT_PRODUCT = CLEAR_GIF;
var HARDCODED_BADGE_COLOR = '#b00000';


/**
 * Representation for the max value the sale discount limit.
 * @private {number}
 */
var MAX_SALE_DISCOUNT_VALUE_ = 100;

var MinimalAd = function() {
  this.baseAnchor = document.getElementById('adDestination');
  this.logoArea = document.getElementById('logoArea');
  this.logo = document.getElementById('logo');

  if (isIE()) {
    this.baseAnchor.className += 'ie';
  }

  // The product page to exit to. If the value is undefined then it defaults to
  // the normal destination URL.
  this.destinationProduct_ = undefined;

  // The exit util.
  this.util_ = undefined;

  this.baseAnchor.addEventListener(
      'click', this.clickHandler.bind(this), false);

  // Set up logo.
  this.logo.src = DEFAULT_LOGO;
  this.logoFillImage = new FillImage(this.logoArea, this.logo);

  // Set up a background
  var adAreaEl = document.getElementsByClassName('adArea')[0];
  this.adAreaBg = adAreaEl.cloneNode(false /* not deep */);
  this.adAreaBg.className += ' adSize';
  this.adAreaBg.style.position = 'absolute';
  this.adAreaBg.style.zIndex = -1;
  adAreaEl.parentNode.insertBefore(this.adAreaBg, adAreaEl);

  // Set up a local style element for css class overrides.
  this.localStyle = document.createElement('style');
  this.localStyle.type = 'text/css';
  document.head.appendChild(this.localStyle);

  // Configure products.
  this.products = [];
  var productElements = this.baseAnchor.querySelectorAll('.product');
  for (var i = 0, l = productElements.length; i < l; ++i) {
    this.products.push(new Product(this, productElements[i]));
  }
};


/**
 * Handles ad click.
 * @param {!Object} e Event object.
 */
MinimalAd.prototype.clickHandler = function(e) {
  if (this.util_) {
    this.util_.exit(this.destinationProduct_);
  }
  e.preventDefault();
};


/**
 * Configures the visual elements for the Minimal template.
 * @param {Object} adData Payload data object.
 * @param {Object} util Payload exit data object.
 */
MinimalAd.prototype.setAdData = function(adData, util) {

  // Flatten the hierarchy for template data.
  this.adData = adData;
  this.rawData = adData.google_template_data.adData[0];
  var templateAdData = getStructuredData(this.rawData);

  // Configure the base link.
  this.util_ = util;
  this.baseAnchor.target = '_top';

  // We register a listener for clicks in the body with useCapture=true
  // so that it won't trigger if any other click listener with
  // useCapture=false has already consumed the event.
  var thisRef = this;
  document.body.addEventListener('click', function() {
    // Sets the global location back to the destination URL if the
    // Headline_0_productClickOnly field value is false.
    if (templateAdData.Headline[0]['productClickOnly'] == 'FALSE') {
      thisRef.setDestination();
    }
  }, true);

  // Sets the global location back to the first product URL or to the
  // destination URL if there is no product URL.
  var firstProductUrl = templateAdData.Product[0].url;
  if (firstProductUrl) {
    this.setDestination('Product_0_url');
  }

  this.setDesign(templateAdData.Design[0]);
  this.setProducts(templateAdData.Product, templateAdData.Design[0]);

  if (templateAdData.Flags != null && typeof templateAdData.Flags == 'object') {
    this.updateLayoutWithFlags(templateAdData.Flags[0]);
  }
};


/**
 * Sets base destination for the ad.
 * @param {string=} opt_destination Ad destination.
 */
MinimalAd.prototype.setDestination = function(opt_destination) {
  if (opt_destination) {
    this.baseAnchor.href = this.rawData[opt_destination];
    this.destinationProduct_ = opt_destination;
  } else {
    this.baseAnchor.href = '';
    this.destinationProduct_ = '';
  }
};


/**
 * Sets dynamic design for the ad.
 * @param {Object} designData Design data from the payload.
 */
MinimalAd.prototype.setDesign = function(designData) {
  this.applyLogoStyles_(designData);
  this.applyBackgroundStyles_(designData);

  // Reset the local css overrides.
  var newLocalStyleHtml = '';

  // Set rounded corners.
  if (designData.cornerStyle && designData.cornerStyle == 'square') {
    newLocalStyleHtml += '.roundedCorners { border-radius: 0; }';
  }

  newLocalStyleHtml += '.salePercentText { ' +
      'color: ' + designData.txtColorCta.toColor() + '; ' + '}';

  newLocalStyleHtml += '.product #Layer_2 path { ' +
      'fill: ' + HARDCODED_BADGE_COLOR + '; ' + '}';

  // Apply css overrides.
  this.localStyle.innerHTML = newLocalStyleHtml;
};


/**
 * Updates layout view depending on the flags passed as a part of payload.
 * @param {Object} flags Object with flags to change the view of the layout.
 */
MinimalAd.prototype.updateLayoutWithFlags = function(flags) {
  if (flags.badgePosition) {
    var badgeContainers = document.querySelectorAll('.product');
    for (var i = 0; i < badgeContainers.length; i++) {
      badgeContainers[i].className += ' ' + flags.badgePosition;
      var scaleX = 1, scaleY = 1, translateX = 0, translateY = 0;

      if (flags.badgePosition == 'left-top' ||
          flags.badgePosition == 'left-bottom') {
        scaleX = -1;
        translateX = 612;
      }
      if (flags.badgePosition == 'left-top' ||
          flags.badgePosition == 'right-top') {
        scaleY = -1;
        translateY = 792;
      }
      badgeContainers[i].querySelector('svg path').
          setAttribute('transform',
          'matrix(' + scaleX + ',0,0,' + scaleY + ',' + translateX + ',' +
          translateY + ')');
    }
  }

  var newLocalStyleHtml = '';

  if (flags.badgeBgColor) {
    newLocalStyleHtml += '.product #Layer_2 path { ' +
        'fill: ' + flags.badgeBgColor.toColor() + '; ' + '}';
  }

  if (flags.badgeTextColor) {
    newLocalStyleHtml += '.salePercentText { ' +
        'color: ' + flags.badgeTextColor.toColor() + '; ' + '}';
  }

  // Apply css overrides.
  this.localStyle.innerHTML = newLocalStyleHtml;
};


/**
 * Applies dynamic styles to the logo element.
 * @param {Object} designData Design data from the payload.
 * @private
 */
MinimalAd.prototype.applyLogoStyles_ = function(designData) {
  this.logo.src = designData.logoImageUrl || DEFAULT_LOGO;
  this.logoFillImage.setAdditionalPadding(designData.logoPadding);
};


/**
 * Applies dynamic styles to the ad background.
 * @param {Object} designData Design data from the payload.
 * @private
 */
MinimalAd.prototype.applyBackgroundStyles_ = function(designData) {
  this.adAreaBg.style.backgroundColor =
      normalizeHexColor(designData.bgColor) || '';
  this.adAreaBg.style.backgroundImage = cssUrl(designData.bgImageUrl) || '';
  this.adAreaBg.style.opacity = designData.bgAlpha || '';
};


/**
 * Sets products data from the payload.
 * @param {!Object} products Products object from the payload.
 * @param {!Object} designData Design object from the payload.
 */
MinimalAd.prototype.setProducts = function(products, designData) {
  for (var i = 0, length = this.products.length; i < length; ++i) {
    this.products[i].setData(products[i] || {}, 'Product_' + i + '_url',
        designData);
  }
};


/**
 * Returns a structured object where fields with name pattern
 * element_0_attribute are folded into a data[element][0][attribute]
 * object structure.
 * @param {Object} rawData the 'adData' element from the adData object.
 * @return {!Object} Returns structured data object.
 */
function getStructuredData(rawData) {
  var dataObject = {};
  for (var datum in rawData) {
    var parts = datum.split(/_/);
    var element = parts.shift();
    var index = Number(parts.shift());
    var attribute = parts.join('');

    if (element && !isNaN(index) && attribute) {
      // Structured element.
      if (!dataObject[element]) {
        dataObject[element] = [];
      }
      if (!dataObject[element][index]) {
        dataObject[element][index] = {};
      }
      dataObject[element][index][attribute] = rawData[datum];
    } else {
      // Top-level element.
      dataObject[datum] = rawData[datum];
    }
  }
  return dataObject;
}

function normalizeHexColor(dataColor) {
  return dataColor ? dataColor.replace(/0x/, '#') : undefined;
}

function cssUrl(url) {
  return url ? 'url("' + url + '")' : undefined;
}

function pxToNumber(pxString) {
  return Number(pxString.replace(/px/, ''));
}



/**
 * Function create object that contains product parameters and functions
 * to handle click and rollover events.
 * @param  {string} ad Advertisement banner object class that contains main data
 * @param  {Element} baseDiv Div element that contains product DOM elements.
 * @constructor
 */
function Product(ad, baseDiv) {
  this.ad = ad;
  this.baseDiv = baseDiv;
  this.image = baseDiv.querySelector('.productImage');
  this.linkField = '';
  this.fillImage = new FillImage(this.baseDiv, this.image);

  var thisRef = this;
  this.baseDiv.addEventListener('mouseover', function() {
    thisRef.setProductDestination();
  }, false);
  // This listener takes precedence over the body click listener that has
  // userCapture=true, guaranteeing that this will run when clicking on the
  // product.
  this.baseDiv.addEventListener('click', function() {
    thisRef.setProductDestination();
  }, false);

  this.image.src = DEFAULT_PRODUCT;
}


/**
 * Sets product destination link.
 */
Product.prototype.setProductDestination = function() {
  if (this.linkField) {
    // Set the global location to this product url.
    this.ad.setDestination(this.linkField);
  }
};


/**
 * Sets data to every product HTML placeholder.
 * @param {!Object} productData Object with product data from the payload.
 * @param {string} linkField Formatted product destiantion URL.
 */
Product.prototype.setData = function(productData, linkField) {
  this.image.src = productData.imageUrl || DEFAULT_PRODUCT;
  this.linkField = linkField;

  // This div truncate img when product has rounded corners.
  var tempDiv = document.createElement('div');
  tempDiv.appendChild(this.image);
  tempDiv.className = 'imgDiv';
  this.baseDiv.appendChild(tempDiv);

  var salePercentDiv = this.baseDiv.querySelector('.salePercentText');
  if (salePercentDiv) {
    if (isEmpty(productData.salePercentDiscount)) {
      this.hideSaleDiscountElement_();
      return;
    }
    var discount = Math.abs(Math.round(productData.salePercentDiscount * 100));
    if (discount == 0) {
      this.hideSaleDiscountElement_();
      return;
    }

    discount = Math.min(discount, MAX_SALE_DISCOUNT_VALUE_);
    salePercentDiv.innerHTML = '-' + discount + '%';
  }
};


/**
 * Hides sale discount element if it is empty or zero.
 * @private
 */
Product.prototype.hideSaleDiscountElement_ = function() {
  this.baseDiv.querySelector('.salePercentText').style.display = 'none';
  this.baseDiv.querySelector('svg').style.display = 'none';
};



/**
 * An image that fills its bounding element but maintains aspect ratio.
 * @param {Element} baseDiv Placeholder which contains the image.
 * @param {Object} image Object that contains image element and image data.
 * @constructor
 */
function FillImage(baseDiv, image) {
  this.originalClass = image.className || '';
  this.baseDiv = baseDiv;
  this.image = image;
  this.additionalPadding = 0;

  var baseDivStyle = window.getComputedStyle(this.baseDiv);

  // If the container iframe has "display: none" in Firefox, baseDivStyle will
  // be null. We can just return, as the ad won't even be visible.
  if (baseDivStyle == null) {
    return;
  }

  this.originalPadding = pxToNumber(baseDivStyle.padding);
  this.originalWidth = pxToNumber(baseDivStyle.width);
  this.originalHeight = pxToNumber(baseDivStyle.height);

  var thisRef = this;
  image.addEventListener('load', function() {
    thisRef.updateSize();
  }, false);

  this.updateSize();
}


/**
 * Sets additional padding for the image within the baseDiv.
 * @param {number} paddingInPixels Additional padding for the image.
 */
FillImage.prototype.setAdditionalPadding = function(paddingInPixels) {
  this.additionalPadding = Number(paddingInPixels);

  this.updateSize();
};


/**
 * Simulates setting the padding around the image, while keeping the
 * size of the container the same.
 */
FillImage.prototype.adjustPadding = function() {
  this.baseDiv.style.padding = (this.originalPadding +
      this.additionalPadding) + 'px';

  this.baseDiv.style.width = (this.originalWidth -
      2 * this.additionalPadding) + 'px';

  this.baseDiv.style.height = (this.originalHeight -
      2 * this.additionalPadding) + 'px';
};


/**
 * Sets correct sizes for the image placeholder depending on the image size and
 * its margin.
 */
FillImage.prototype.updateSize = function() {
  // Adjust padding first, so we get correct measurements.
  this.adjustPadding();

  var baseStyle = window.getComputedStyle(this.baseDiv);

  // If the container iframe has "display: none" in Firefox, baseStyle will
  // be null. We can just return, as the ad won't even be visible.
  if (baseStyle == null) {
    return;
  }

  var baseWidth = pxToNumber(baseStyle.width);
  var baseHeight = pxToNumber(baseStyle.height);
  var baseAspectRatio = baseWidth / baseHeight;

  // Reset the class before measuring the image.
  this.image.className = this.originalClass;

  var imageWidth = this.image.width;
  var imageHeight = this.image.height;
  var imageAspectRatio = imageWidth / imageHeight;

  // Ensure image fills in appropriate direction.
  var imageClass;
  if (imageAspectRatio > baseAspectRatio) {
    imageClass = ' wide';
  } else {
    imageClass = ' tall';
  }

  this.image.className = this.originalClass + imageClass;

  // Vertical Centering.
  // Adjust height margins. Width is handled in css by 'margin: auto'.
  var imageStyle = window.getComputedStyle(this.image);
  var imageStyledHeight = pxToNumber(imageStyle.height);
  var newTopMargin = Math.round((baseHeight - imageStyledHeight) / 2);

  this.image.style.marginTop = newTopMargin + 'px';
};


/**
 * String prototype to format string for a CSS color value.
 * @return {?string} Returns color formatted to full HEX value.
 */
String.prototype.toColor = function() {
  var return_obj = this;
  if (!this) {
    return null;
  }

  if (this.indexOf('#') != -1) {
    return_obj = this.replace(/#/g, '0x');
  }

  return '#' + return_obj.split('0x').join('');
};


/**
 * Verifies if the string from DAB is really empty.
 * @param {string} str String to verify.
 * @return {boolean} Returns true if the string is empty.
 */
var isEmpty = function(str) {
  if (!str) {
    return true;
  }
  str = str.trim();
  return !str || !str.length;
};


/**
 * Parts of the user agent value, which are used to detect IE.
 * @enum {string}
 */
var ieUserAgentPart = {
  IE_V11_AND_ABOVE: 'trident/',
  IE_BELOW_V11: 'msie'
};


/**
 * Check if the user is using IE.
 * @return {boolean} Whether is IE.
 */
function isIE() {
  var myNav = navigator.userAgent.toLowerCase();
  return ((myNav.indexOf(ieUserAgentPart.IE_BELOW_V11) != -1) ||
      myNav.indexOf(ieUserAgentPart.IE_V11_AND_ABOVE) != -1);
}
