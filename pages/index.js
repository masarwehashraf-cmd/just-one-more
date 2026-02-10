
export default function Home() {
  return (
    <div className="container">
      <h1>Just One More</h1>
      <h2>قطعة وحدة كمان</h2>

      <div className="products">
        <div className="card">
          <img src="https://via.placeholder.com/300" />
          <h3>Classic Black Hoodie</h3>
          <p>$49</p>
          <button>Add to cart</button>
        </div>

        <div className="card">
          <img src="https://via.placeholder.com/300" />
          <h3>Street T-Shirt</h3>
          <p>$29</p>
          <button>Add to cart</button>
        </div>
      </div>
    </div>
  );
}
