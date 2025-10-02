import Image from 'next/image';

export default function TestImage() {
  return (
    <div style={{ padding: '2rem', background: 'white' }}>
      <h1>Image Test</h1>
      <p>If image loads below, config works:</p>
      
      {/* Your actual failing URL */}
      <Image
        src="https://lh3.googleusercontent.com/a/ACg8ocIGGF4zRqG_YN-CFwnSX2fQUihsJiGT_c6gx1U3pVQF-nGIq4M=s96-c"
        alt="Test Google Image"
        width={96}
        height={96}
      />
      
      <p style={{ marginTop: '1rem' }}>✅ Success! Config is working.</p>
    </div>
  );
}
