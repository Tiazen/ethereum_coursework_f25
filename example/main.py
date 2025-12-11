import eth_oauth
import fastapi

app = fastapi.FastAPI()


verifier = eth_oauth.JWTVerifier("0x1128BdaDdf8717319BBf6086d70455B0b99ce9ef", "https://ethereum-sepolia-rpc.publicnode.com")

def userCheck(username: str, password: str):
    return username == "admin" and password == "admin"

@app.get("/")
def read_root():
    return fastapi.responses.HTMLResponse(content=open("page/index.html").read())


@app.post("/login")
async def login(request: fastapi.Request):
    data = await request.json()
    return fastapi.responses.JSONResponse(
        content={"given_data": data,
                 "user_check": "some check and result here"}
        )

@app.post('/g-auth-fill')
async def g_auth_fill(request: fastapi.Request):
    data = await request.json()
    
    token = data.get("token")
    
    if token:
        result = verifier.verify(token)
    
        return fastapi.responses.JSONResponse(
            content={"success": True, "data": result}
        )

if __name__ == "__main__":
    import uvicorn
    uvicorn.run(app, host="0.0.0.0", port=8000)