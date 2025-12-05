import { Link } from "react-router-dom";

export const Footer = () => {
  return (
    <footer className="bg-luxury-bg text-luxury-text py-12">
      <div className="container mx-auto px-4">
        <div className="grid md:grid-cols-4 gap-8 mb-8">
          <div>
            <div className="flex items-center space-x-2 mb-4">
              <div className="w-8 h-8 bg-gold rounded-sm transform rotate-45"></div>
              <h3 className="text-xl font-bold">CROWN AUCTIONS</h3>
            </div>
            <p className="text-luxury-text/70 text-sm">
              Specialising in Fine Jewellery, Diamonds, and Swiss Watch Auctions
            </p>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-gold">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/#home" className="text-luxury-text/70 hover:text-gold transition-colors">Home</Link></li>
              <li><Link to="/#about" className="text-luxury-text/70 hover:text-gold transition-colors">About Us</Link></li>
              <li><Link to="/#buyers" className="text-luxury-text/70 hover:text-gold transition-colors">Buyers</Link></li>
              <li><Link to="/#sellers" className="text-luxury-text/70 hover:text-gold transition-colors">Sellers</Link></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-gold">Services</h4>
            <ul className="space-y-2 text-sm">
              <li><Link to="/#auctions" className="text-luxury-text/70 hover:text-gold transition-colors">Browse Auctions</Link></li>
              <li><a href="#" className="text-luxury-text/70 hover:text-gold transition-colors">Valuation Services</a></li>
              <li><a href="#" className="text-luxury-text/70 hover:text-gold transition-colors">Sell With Us</a></li>
              <li><a href="#" className="text-luxury-text/70 hover:text-gold transition-colors">Authentication</a></li>
            </ul>
          </div>
          
          <div>
            <h4 className="font-bold mb-4 text-gold">Contact</h4>
            <ul className="space-y-2 text-sm text-luxury-text/70">
              <li>Email: info@crownauctions.com</li>
              <li>Phone: +61 123 456 789</li>
              <li>Licensed Auctioneer</li>
              <li>ABN: 12 345 678 901</li>
            </ul>
          </div>
        </div>
        
        <div className="border-t border-luxury-text/20 pt-8 text-center text-sm text-luxury-text/60">
          <p>&copy; {new Date().getFullYear()} Crown Auctions. All rights reserved. Licensed under the Auctioneers Act 2014.</p>
        </div>
      </div>
    </footer>
  );
};
