// React ko import karte hain kyunki Class Components banane ke liye React.Component ki zaroorat hoti hai.
import React from "react";

// ErrorBoundary class component banaya ja raha hai. Error boundaries sirf class components hi ban sakte hain.
// Inka kaam hota hai apne child components me aane wale JavaScript errors ko catch karna, 
// aur unhe handle karke ek fallback UI dikhana (taaki puri website crash na ho).
export class ErrorBoundary extends React.Component {
  // Constructor component ka initial state set karne ke liye use hota hai.
  constructor(props) {
    // Parent class (React.Component) ke constructor ko call karna zaroori hai.
    super(props);
    // Initial state mein: 
    // hasError: batata hai ki koi error aaya hai ya nahi (shuru mein false).
    // error: exact error object ko store karega.
    // errorInfo: error kaha (kis component tree mein) aaya uski details/stack trace rakhega.
    this.state = { hasError: false, error: null, errorInfo: null };
  }

  // getDerivedStateFromError ek React lifecycle method hai.
  // Jab kisi child component me error aata hai, tab yeh method trigger hota hai.
  // Iska main kaam next render (UI update) ke liye state update karna hai.
  static getDerivedStateFromError(error) {
    // Hum state return kar rahe hain jisse 'hasError' true ho jayega aur error save ho jayega.
    // Iske baad render() method dobara call hoga aur fallback UI show karega.
    return { hasError: true, error };
  }

  // componentDidCatch dusra lifecycle method hai jo error catch hone ke baad run hota hai.
  // Iska main kaam errors ko log karna (jaise console ya kisi error reporting service/Sentry me bhejna) hota hai.
  componentDidCatch(error, errorInfo) {
    // Hum errorInfo ko state me save kar rahe hain taaki usko UI par detail me dikha sakein.
    this.setState({ errorInfo });
    // Console mein error print kar rahe hain developer debugging ke liye. (Interview me bata sakte hain ki yaha Sentry/NewRelic logging aati hai).
    console.error("ErrorBoundary caught an error", error, errorInfo);
  }

  // render() method decide karta hai ki browser par kya dikhna chahiye.
  render() {
    // Agar state.hasError true hai, matlab child components me se kisi me crash hua hai.
    if (this.state.hasError) {
      // Toh hum ek custom Fallback UI render karte hain (taaki user blank white screen na dekhe).
      return (
        <div style={{ padding: "20px", background: "#f8d7da", color: "#721c24" }}>
          {/* User-friendly message */}
          <h2>Something went wrong.</h2>
          {/* details tag se hum ek collapsible section banate hain error stack dekhne ke liye */}
          <details style={{ whiteSpace: "pre-wrap" }}>
            <summary>Click for error details</summary>
            {/* Agar error string available hai toh use display karo */}
            {this.state.error && this.state.error.toString()}
            <br />
            {/* errorInfo.componentStack me batata hai ki error exactly kin components ki vajah se aaya */}
            {this.state.errorInfo && this.state.errorInfo.componentStack}
          </details>
        </div>
      );
    }

    // Agar koi error nahi hai (hasError == false), toh bas normal child components ko render hone do.
    return this.props.children;
  }
}