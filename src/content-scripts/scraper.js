// Ensure `browser` is available in all browsers (Firefox, Chrome, etc.)
if (typeof browser === "undefined" && typeof chrome !== "undefined") {
  // eslint-disable-next-line no-global-assign
  browser = chrome
}

console.log("Content script initializing...");

// Listen for scrape command from background script
browser.runtime.onMessage.addListener((message, sender, sendResponse) => {
  console.log("Content script received message:", message)
  if (message.action === "scrape") {
    // Le background script ne devrait envoyer le message que si l'onglet est actif
    console.log("Starting to scrape the page...")
    scrapeCurrentPage().then(pageData => {
      browser.runtime.sendMessage({
        action: "scrapedData",
        data: pageData
      });
    });
  }
  return false; // Don't keep the message channel open
})

// Scrape the current page
function scrapeCurrentPage() {
  // Get the current domain to check if we have a parser
  const domain = window.location.hostname.replace("www.", "")

  // Request known parsers from background script
  return new Promise((resolve) => {
    browser.runtime.sendMessage({ action: "getKnownParsers" }, (response) => {
      const knownParsers = response.knownParsers

      // Check if we have a parser for this domain
      let parser = null
      for (const [parserDomain, selectors] of Object.entries(knownParsers)) {
        if (domain.includes(parserDomain)) {
          parser = selectors
          break
        }
      }

      // If we have a parser, use it to scrape the page
      if (parser) {
        const data = {
          hasKnownParser: true,
          url: window.location.href,
          title: document.title,
          price: getValue(parser.price),
          shippingPrice: getValue(parser.shippingPrice),
          insurancePrice: getValue(parser.insurancePrice),
          priceCurrency: getValue(parser.priceCurrency),
          seller: getValue(parser.seller),
          timestamp: new Date().toISOString(),
        }
        resolve(data)
      } else {
        // No parser, return basic page info
        const data = {
          hasKnownParser: false,
          url: window.location.href,
          title: document.title,
          timestamp: new Date().toISOString(),
        }
        resolve(data)
      }
    })
  })
}

const currencyDictionary = {
  'ALL': ['lek', 'leks'],
  'AFN': ['؋', 'afghani'],
  'ARS': ['ars', 'peso argentino'],
  'AWG': ['ƒ', 'aruban florin'],
  'AUD': ['aud$', 'australian dollar'],
  'AZN': ['₼', 'manat'],
  'BSD': ['bsd', 'bahamian dollar'],
  'BBD': ['bbd', 'barbadian dollar'],
  'BYN': ['br', 'belarus ruble'],
  'BZD': ['bz$', 'belize dollar'],
  'BMD': ['bmd', 'bermudian dollar'],
  'BOB': ['$b', 'boliviano'],
  'BAM': ['km', 'convertible mark'],
  'BWP': ['p', 'pula'],
  'BGN': ['лв', 'lev'],
  'BRL': ['r$', 'real'],
  'BND': ['bnd', 'brunei dollar'],
  'KHR': ['៛', 'riel'],
  'CAD': ['cad$', 'canadian dollar'],
  'KYD': ['kyd', 'cayman islands dollar'],
  'CLP': ['clp$', 'chilean peso'],
  'CNY': ['¥', 'yuan', 'renminbi'],
  'COP': ['col$', 'colombian peso'],
  'CRC': ['₡', 'colón'],
  'HRK': ['kn', 'kuna'],
  'CUP': ['₱', 'cuban peso'],
  'CZK': ['kč', 'koruna'],
  'DKK': ['dkk', 'danish krone'],
  'DOP': ['rd$', 'dominican peso'],
  'XCD': ['xcd', 'east caribbean dollar'],
  'EGP': ['egp£', 'egyptian pound'],
  'EUR': ['€', 'eur', 'euro', 'euros'],
  'FKP': ['fkp£', 'falkland islands pound'],
  'FJD': ['fjd$', 'fiji dollar'],
  'GHS': ['¢', 'ghana cedi'],
  'GIP': ['gip£', 'gibraltar pound'],
  'GTQ': ['q', 'quetzal'],
  'GGP': ['ggp£', 'guernsey pound'],
  'GYD': ['gyd', 'guyana dollar'],
  'HNL': ['l', 'lempira'],
  'HKD': ['hkd$', 'hong kong dollar'],
  'HUF': ['ft', 'forint'],
  'ISK': ['isk', 'iceland króna'],
  'INR': ['₹', 'rupee'],
  'IDR': ['rp', 'rupiah'],
  'IRR': ['﷼', 'iranian rial'],
  'IMP': ['imp£', 'isle of man pound'],
  'ILS': ['₪', 'shekel'],
  'JMD': ['j$', 'jamaican dollar'],
  'JPY': ['¥', 'jpy', 'yen', 'yens'],
  'JEP': ['jep£', 'jersey pound'],
  'KZT': ['лв', 'tenge'],
  'KPW': ['₩', 'north korean won'],
  'KRW': ['₩', 'south korean won'],
  'KGS': ['лв', 'som'],
  'LAK': ['₭', 'kip'],
  'LBP': ['lbp£', 'lebanese pound'],
  'LRD': ['lrd$', 'liberian dollar'],
  'MKD': ['ден', 'denar'],
  'MYR': ['rm', 'ringgit'],
  'MUR': ['₨', 'mauritius rupee'],
  'MXN': ['mxn$', 'mexican peso'],
  'MNT': ['₮', 'tugrik'],
  'MZN': ['mt', 'metical'],
  'NAD': ['nad$', 'namibia dollar'],
  'NPR': ['₨', 'nepalese rupee'],
  'ANG': ['ƒ', 'guilder'],
  'NZD': ['nzd$', 'new zealand dollar'],
  'NIO': ['c$', 'córdoba'],
  'NGN': ['₦', 'naira'],
  'NOK': ['nok', 'norwegian krone'],
  'OMR': ['﷼', 'rial omani'],
  'PKR': ['₨', 'pakistan rupee'],
  'PAB': ['b/.', 'balboa'],
  'PYG': ['gs', 'guarani'],
  'PEN': ['s/.', 'sol'],
  'PHP': ['₱', 'philippine peso'],
  'PLN': ['zł', 'zloty'],
  'QAR': ['﷼', 'qatari rial'],
  'RON': ['lei', 'romanian leu'],
  'RUB': ['₽', 'ruble'],
  'SHP': ['shp£', 'saint helena pound'],
  'SAR': ['﷼', 'saudi riyal'],
  'RSD': ['дин.', 'serbian dinar'],
  'SCR': ['₨', 'seychelles rupee'],
  'SGD': ['sgd$', 'singapore dollar'],
  'SBD': ['sbd$', 'solomon islands dollar'],
  'SOS': ['s', 'somali shilling'],
  'ZAR': ['r', 'rand'],
  'LKR': ['₨', 'sri lanka rupee'],
  'SEK': ['sek', 'swedish krona'],
  'CHF': ['chf', 'franc', 'francs'],
  'SRD': ['srd$', 'suriname dollar'],
  'SYP': ['syp£', 'syria pound'],
  'TWD': ['nt$', 'new taiwan dollar'],
  'THB': ['฿', 'baht'],
  'TTD': ['tt$', 'trinidad and tobago dollar'],
  'TRY': ['₺', 'turkish lira'],
  'TVD': ['tvd$', 'tuvalu dollar'],
  'UAH': ['₴', 'hryvnia'],
  'GBP': ['£', 'gbp', 'pound', 'pounds'],
  'USD': ['$', 'usd', 'dollar', 'dollars'],
  'UYU': ['$u', 'peso uruguayo'],
  'UZS': ['лв', 'uzbekistan som'],
  'VEF': ['bs', 'bolívar'],
  'VND': ['₫', 'dong'],
  'YER': ['﷼', 'yemen rial'],
  'ZWD': ['z$', 'zimbabwe dollar']
}

// Strategy functions for different types of selectors
const strategies = {
  // Simple text content extraction
  textContent: (selector) => {
    try {
      const element = document.querySelector(selector)
      return element ? element.textContent.trim() : ""
    } catch (e) {
      return ""
    }
  },

  // Split price and currency from a single element and standardize currency format
  splitPriceCurrency: (selector, type = 'price') => {
    try {
      console.log("Executing splitPriceCurrency with selector:", selector, "and type:", type)
      const element = document.querySelector(selector)
      if (!element) return ""
      
      // Nettoyer et normaliser le texte (convertir en minuscules)
      let text = element.textContent.trim().toLowerCase()

      // Liste des mots indiquant la gratuité
      const freeTerms = [
        'gratuit',
        'free',
        'postage included',
        'gratis',
        'kostenlos',
        'offert',
        'gratuito'
      ]

      // Vérifier si c'est gratuit
      if (freeTerms.some(term => text.includes(term))) {
        return type === 'price' ? '0' : 'FREE'
      }
      
      // Extraire le nombre (avant ou après la devise)
      const numberMatch = text.match(/\d+(?:[.,]\d+)?/)
      if (!numberMatch) return ""
      
      const price = numberMatch[0].replace(',', '.')
      const textWithoutNumber = text.replace(numberMatch[0], '').trim()

      if (type === 'price') {
        return price
      } else {
        // Chercher la devise dans le texte restant
        for (const [standardCode, variants] of Object.entries(currencyDictionary)) {
          if (variants.some(variant => textWithoutNumber.includes(variant))) {
            return standardCode
          }
        }
      }
      
      return ""
    } catch (e) {
      console.error("Error in splitPriceCurrency:", e)
      return ""
    }
  },

  extractPrice: (selector) => {
    try {
      const element = document.querySelector(selector)
      if (!element) return ""
      
      const text = element.textContent.trim()
      const match = text.match(/(\d+[.,]?\d*)/)
      
      if (match) {
        return match[0].replace(',', '.')
      }
      
      return ""
    } catch (e) {
      console.error("Error in extractPrice strategy:", e)
      return ""
    }
  },

  extractCurrency: (selector) => {
    try {
      const element = document.querySelector(selector)
      if (!element) return ""
      
      const text = element.textContent.trim().toLowerCase()
      
      for (const [standardCode, variants] of Object.entries(currencyDictionary)) {
        if (variants.some(variant => text.includes(variant))) {
          return standardCode
        }
      }
      
      return ""
    } catch (e) {
      console.error("Error in extractCurrency strategy:", e)
      return ""
    }
  },

  // Fonction utilitaire pour extraire le nom de domaine principal
  _extractMainDomain: (urlOrSelector = '') => {
    try {
      let url
      if (typeof urlOrSelector === 'string' && urlOrSelector.startsWith('http')) {
        url = new URL(urlOrSelector)
      } else {
        const element = urlOrSelector ? document.querySelector(urlOrSelector) : null
        url = element?.href ? new URL(element.href) : new URL(window.location.href)
      }
      
      return url.hostname.replace(/^www\./, '').split('.')[0]
    } catch (e) {
      console.error("Error in _extractMainDomain:", e)
      return ""
    }
  },

  // Extract marketplace seller from URL parameter and combine with domain name
  urlParameter: (selector, param) => {
    try {
      const element = document.querySelector(selector)
      if (!element || !element.href) return ""
      
      const url = new URL(element.href)
      const sellerName = url.searchParams.get(param) || ""
      
      // Toujours combiner avec le nom de domaine car c'est un vendeur marketplace
      if (sellerName) {
        const domainName = strategies._extractMainDomain()
        return `${domainName} - ${sellerName}`
      }
      
      return ""
    } catch (e) {
      console.error("Error in urlParameter strategy:", e)
      return ""
    }
  },

  domainNameAndSeller: (selector) => {
    const domainName = strategies._extractMainDomain(selector)
    const sellerName = strategies.textContent(selector)
    return `${domainName} - ${sellerName}`
  },

  // Extract domain name from URL in href attribute or from current page if no selector
  domainName: (selector = '') => {
    const domainName = strategies._extractMainDomain(selector)
    return domainName.charAt(0).toUpperCase() + domainName.slice(1)
  },

  // Return empty string for no strategy
  none: () => "0"
}

// Function to get value based on parser config
function getValue(config) {
  if (!config || !config.strategy) {
    return ""
  }

  const strategy = strategies[config.strategy]
  if (!strategy) {
    console.warn(`Unknown strategy: ${config.strategy}`)
    return ""
  }

  return strategy(config.selector, config.param)
}
