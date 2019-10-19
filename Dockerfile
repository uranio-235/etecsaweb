FROM microsoft/dotnet:sdk AS build-env
# 👆 con la imagen de la SDK
# el FROM debe ser la primera linea siempre


# Exponemos el puerto 80. Pero para que funcione hay que especificarle
# en los parámetros «.UseUrls(portnumber)»
#   public static IWebHostBuilder CreateWebHostBuilder(string[] args) =>
#       WebHost.CreateDefaultBuilder(args)
#           .UseUrls("http://0.0.0.0:80") // <-- añade esta cláusula al Program.cs
#           .UseStartup<Startup>();
EXPOSE 80

# muévete para /app
WORKDIR /app

# copia el csproj para aquí y restaura en un layer aparte
COPY *.csproj ./

# efectua la restauración
RUN dotnet restore -v n -s http://192.168.111.128:8081/repository/nuget.org-proxy/
#RUN dotnet restore -v n

# copia la aplicación y compílala
COPY . ./
RUN dotnet publish -c Release -o out

# exporta como volumen, el directorio donde está la base de datos de etecsa
VOLUME ["/app/db"]

# con la imagen del runtime, ejecuta la aplicación
FROM microsoft/dotnet:aspnetcore-runtime
WORKDIR /app
COPY --from=build-env /app/out .

# arranca! con el nombre de la app, recuerda cambiar el nombre de la .dll
ENTRYPOINT ["dotnet", "EtecsaWeb.dll"]